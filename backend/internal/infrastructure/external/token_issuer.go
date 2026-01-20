package external

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/dedata/dedata-backend/config"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"go.uber.org/zap"
)

// ERC20 Transfer ABI
const erc20ABI = `[{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","type":"function"}]`

// TransactionStatus 交易状态
type TransactionStatus struct {
	Found       bool   // 是否找到交易
	Pending     bool   // 是否还在pending
	Success     bool   // 是否成功
	Failed      bool   // 是否失败
	BlockNumber uint64 // 区块号（如果已确认）
}

// TokenIssuer Token issuer interface
type TokenIssuer interface {
	IssueToken(ctx context.Context, toAddress string, amount string) (txHash string, err error)
	CheckTransactionStatus(ctx context.Context, txHash string) (*TransactionStatus, error)
}

// BlockchainTokenIssuer blockchain-based token issuer
type BlockchainTokenIssuer struct {
	client       *ethclient.Client
	privateKey   *ecdsa.PrivateKey
	fromAddress  common.Address
	tokenAddress common.Address
	chainID      *big.Int
	gasLimit     uint64
	maxGasPrice  *big.Int
	logger       *zap.Logger
	tokenABI     abi.ABI
}

// NewBlockchainTokenIssuer creates a new blockchain token issuer
func NewBlockchainTokenIssuer(cfg *config.BlockchainConfig, logger *zap.Logger) (*BlockchainTokenIssuer, error) {
	// Connect to RPC node
	client, err := ethclient.Dial(cfg.RPCURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RPC: %w", err)
	}

	// Parse private key
	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(cfg.PrivateKey, "0x"))
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	// Get sender address
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("failed to get public key")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	// Parse token contract address
	tokenAddress := common.HexToAddress(cfg.TokenAddress)

	// Parse ERC20 ABI
	tokenABI, err := abi.JSON(strings.NewReader(erc20ABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse ERC20 ABI: %w", err)
	}

	// Set gas limit
	gasLimit := cfg.GasLimit
	if gasLimit == 0 {
		gasLimit = 100000 // default 100k
	}

	// Set max gas price
	maxGasPrice := big.NewInt(cfg.MaxGasPrice)
	if cfg.MaxGasPrice == 0 {
		maxGasPrice = big.NewInt(50) // default 50 Gwei
	}
	maxGasPrice = new(big.Int).Mul(maxGasPrice, big.NewInt(1e9)) // convert to wei

	logger.Info("Blockchain token issuer initialized",
		zap.String("from_address", fromAddress.Hex()),
		zap.String("token_address", tokenAddress.Hex()),
		zap.Int64("chain_id", cfg.ChainID),
	)

	return &BlockchainTokenIssuer{
		client:       client,
		privateKey:   privateKey,
		fromAddress:  fromAddress,
		tokenAddress: tokenAddress,
		chainID:      big.NewInt(cfg.ChainID),
		gasLimit:     gasLimit,
		maxGasPrice:  maxGasPrice,
		logger:       logger,
		tokenABI:     tokenABI,
	}, nil
}

// IssueToken issues tokens to specified address
func (b *BlockchainTokenIssuer) IssueToken(ctx context.Context, toAddress string, amount string) (string, error) {
	b.logger.Info("Starting token issuance",
		zap.String("to", toAddress),
		zap.String("amount", amount),
	)

	// Verify RPC connection
	chainID, err := b.client.ChainID(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to connect to RPC: %w", err)
	}
	b.logger.Info("Connected to blockchain",
		zap.String("chain_id", chainID.String()),
		zap.String("expected_chain_id", b.chainID.String()),
	)

	// Check sender's native balance (for gas)
	balance, err := b.client.BalanceAt(ctx, b.fromAddress, nil)
	if err != nil {
		return "", fmt.Errorf("failed to get sender balance: %w", err)
	}
	b.logger.Info("Sender balance",
		zap.String("from_address", b.fromAddress.Hex()),
		zap.String("native_balance", balance.String()),
	)
	if balance.Cmp(big.NewInt(0)) == 0 {
		return "", fmt.Errorf("sender has no native token for gas fees")
	}

	// Parse recipient address
	to := common.HexToAddress(toAddress)
	if to == (common.Address{}) {
		return "", fmt.Errorf("invalid recipient address: %s", toAddress)
	}

	// Parse amount (assume amount is in tokens, need to convert to smallest unit)
	// Example: "10" -> 10 * 10^18 (assuming 18 decimals)
	amountBig, ok := new(big.Int).SetString(amount, 10)
	if !ok {
		return "", fmt.Errorf("invalid amount: %s", amount)
	}
	// Convert to wei (assuming 18 decimals)
	decimals := big.NewInt(1e18)
	amountInWei := new(big.Int).Mul(amountBig, decimals)

	b.logger.Info("Transfer details",
		zap.String("to_address", to.Hex()),
		zap.String("amount_tokens", amount),
		zap.String("amount_wei", amountInWei.String()),
		zap.String("token_contract", b.tokenAddress.Hex()),
	)

	// Check sender's token balance before attempting transfer
	senderTokenBalance, err := b.GetBalance(ctx, b.fromAddress.Hex())
	if err != nil {
		b.logger.Warn("Failed to check sender token balance",
			zap.Error(err),
			zap.String("continuing", "true"),
		)
	} else {
		b.logger.Info("Sender token balance",
			zap.String("balance_wei", senderTokenBalance.String()),
			zap.String("required_wei", amountInWei.String()),
		)

		if senderTokenBalance.Cmp(amountInWei) < 0 {
			return "", fmt.Errorf("insufficient token balance: have %s, need %s", senderTokenBalance.String(), amountInWei.String())
		}
	}

	// Encode transfer function call
	data, err := b.tokenABI.Pack("transfer", to, amountInWei)
	if err != nil {
		return "", fmt.Errorf("failed to pack transfer data: %w", err)
	}

	// Get nonce
	nonce, err := b.client.PendingNonceAt(ctx, b.fromAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get nonce: %w", err)
	}
	b.logger.Info("Nonce obtained", zap.Uint64("nonce", nonce))

	// Get current gas price and prepare for EIP-1559
	baseFee, err := b.getBaseFee(ctx)
	if err != nil {
		b.logger.Warn("Failed to get base fee, falling back to legacy transaction",
			zap.Error(err),
		)
		// Fallback to legacy transaction
		return b.sendLegacyTransaction(ctx, to, data, nonce, b.gasLimit, balance)
	}

	// Calculate priority fee (tip to miners)
	// For Polygon: 30-50 Gwei is usually good
	maxPriorityFeePerGas := big.NewInt(35000000000) // 35 Gwei

	// Calculate max fee per gas = (2 * baseFee) + maxPriorityFee
	maxFeePerGas := new(big.Int).Mul(baseFee, big.NewInt(2))
	maxFeePerGas = new(big.Int).Add(maxFeePerGas, maxPriorityFeePerGas)

	b.logger.Info("EIP-1559 gas fees calculated",
		zap.String("base_fee_wei", baseFee.String()),
		zap.String("max_priority_fee_wei", maxPriorityFeePerGas.String()),
		zap.String("max_fee_per_gas_wei", maxFeePerGas.String()),
	)

	// Estimate gas limit from the blockchain
	gasLimit, err := b.estimateGas(ctx, to, data)
	if err != nil {
		b.logger.Warn("Failed to estimate gas, using configured limit",
			zap.Error(err),
			zap.Uint64("fallback_limit", b.gasLimit),
		)
		gasLimit = b.gasLimit
	} else {
		// Add 20% buffer to estimated gas for safety
		buffer := new(big.Int).Div(new(big.Int).SetUint64(gasLimit), big.NewInt(5)) // 20%
		gasLimit = gasLimit + buffer.Uint64()

		b.logger.Info("Gas estimated from chain",
			zap.Uint64("estimated_gas", gasLimit),
		)
	}

	// Calculate total cost estimate
	gasCost := new(big.Int).Mul(maxFeePerGas, new(big.Int).SetUint64(gasLimit))
	b.logger.Info("Transaction cost estimate (EIP-1559)",
		zap.String("gas_cost_wei", gasCost.String()),
		zap.String("sender_balance_wei", balance.String()),
	)

	// Create EIP-1559 transaction (Type 2)
	tx := types.NewTx(&types.DynamicFeeTx{
		ChainID:   b.chainID,
		Nonce:     nonce,
		GasTipCap: maxPriorityFeePerGas, // maxPriorityFeePerGas
		GasFeeCap: maxFeePerGas,         // maxFeePerGas
		Gas:       gasLimit,
		To:        &b.tokenAddress, // IMPORTANT: calling token contract, not recipient
		Value:     big.NewInt(0),
		Data:      data,
	})

	b.logger.Info("EIP-1559 transaction created",
		zap.String("to", tx.To().Hex()),
		zap.Uint64("nonce", tx.Nonce()),
		zap.Uint64("gas", tx.Gas()),
		zap.String("max_fee_per_gas", maxFeePerGas.String()),
		zap.String("max_priority_fee", maxPriorityFeePerGas.String()),
		zap.String("type", "EIP-1559"),
	)

	// Sign transaction (LatestSignerForChainID handles EIP-1559 transactions)
	signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(b.chainID), b.privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	b.logger.Info("Transaction signed", zap.String("tx_hash", signedTx.Hash().Hex()))

	// Send transaction
	err = b.client.SendTransaction(ctx, signedTx)
	if err != nil {
		b.logger.Error("Failed to send transaction to network",
			zap.String("tx_hash", signedTx.Hash().Hex()),
			zap.Error(err),
		)
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	txHash := signedTx.Hash().Hex()

	// Verify the transaction is in the mempool (optional check, don't fail if not found)
	time.Sleep(500 * time.Millisecond) // Wait a bit for tx to propagate
	_, isPending, err := b.client.TransactionByHash(ctx, signedTx.Hash())
	if err != nil {
		b.logger.Warn("Transaction sent but cannot be found in network yet",
			zap.String("tx_hash", txHash),
			zap.Error(err),
			zap.String("hint", "This is normal - RPC node might be syncing or transaction propagating"),
		)
	} else {
		b.logger.Info("Transaction verified in network",
			zap.String("tx_hash", txHash),
			zap.Bool("is_pending", isPending),
		)
	}

	b.logger.Info("Token issuance transaction sent to network",
		zap.String("tx_hash", txHash),
		zap.String("to", toAddress),
		zap.String("amount", amount),
		zap.Uint64("nonce", nonce),
		zap.Uint64("gas_limit", gasLimit),
		zap.String("max_fee_per_gas", maxFeePerGas.String()),
		zap.String("polygonscan", fmt.Sprintf("https://polygonscan.com/tx/%s", txHash)),
	)

	// 立即返回 tx_hash，不等待确认
	// Worker 会保存 tx_hash，下次轮询时检查交易状态
	return txHash, nil
}

// WaitForTransactionConfirmation 等待交易确认（可选，由 worker 调用）
func (b *BlockchainTokenIssuer) WaitForTransactionConfirmation(ctx context.Context, txHashStr string) error {
	txHash := common.HexToHash(txHashStr)

	b.logger.Info("Waiting for transaction confirmation",
		zap.String("tx_hash", txHashStr),
	)

	// Wait for transaction to be mined and confirmed
	receipt, err := b.waitForTransactionReceipt(ctx, txHash)
	if err != nil {
		b.logger.Error("Transaction failed to confirm",
			zap.String("tx_hash", txHashStr),
			zap.Error(err),
		)
		return fmt.Errorf("transaction not confirmed: %w", err)
	}

	// Check if transaction succeeded
	if receipt.Status != types.ReceiptStatusSuccessful {
		b.logger.Error("Transaction confirmed but failed on chain",
			zap.String("tx_hash", txHashStr),
			zap.Uint64("status", receipt.Status),
			zap.Uint64("block", receipt.BlockNumber.Uint64()),
		)
		return fmt.Errorf("transaction failed on chain, tx_hash: %s, status: %d", txHashStr, receipt.Status)
	}

	b.logger.Info("Transaction confirmed successfully",
		zap.String("tx_hash", txHashStr),
		zap.Uint64("block_number", receipt.BlockNumber.Uint64()),
		zap.Uint64("gas_used", receipt.GasUsed),
	)

	return nil
}

// CheckTransactionStatus 检查交易状态，用于服务重启后恢复
func (b *BlockchainTokenIssuer) CheckTransactionStatus(ctx context.Context, txHashStr string) (*TransactionStatus, error) {
	txHash := common.HexToHash(txHashStr)

	status := &TransactionStatus{
		Found:   false,
		Pending: false,
		Success: false,
		Failed:  false,
	}

	// 1. 尝试获取交易收据（已确认的交易）
	receipt, err := b.client.TransactionReceipt(ctx, txHash)
	if err == nil {
		// 交易已确认
		status.Found = true
		status.Pending = false
		status.BlockNumber = receipt.BlockNumber.Uint64()

		if receipt.Status == types.ReceiptStatusSuccessful {
			status.Success = true
			b.logger.Info("Transaction already confirmed and successful",
				zap.String("tx_hash", txHashStr),
				zap.Uint64("block", receipt.BlockNumber.Uint64()),
			)
		} else {
			status.Failed = true
			b.logger.Warn("Transaction already confirmed but failed",
				zap.String("tx_hash", txHashStr),
				zap.Uint64("block", receipt.BlockNumber.Uint64()),
				zap.Uint64("status", receipt.Status),
			)
		}
		return status, nil
	}

	// 2. 收据未找到，检查交易是否在mempool中（pending）
	if strings.Contains(err.Error(), "not found") {
		tx, isPending, txErr := b.client.TransactionByHash(ctx, txHash)
		if txErr == nil {
			// 交易存在
			status.Found = true
			status.Pending = isPending

			if isPending {
				b.logger.Info("Transaction found in mempool (pending)",
					zap.String("tx_hash", txHashStr),
					zap.Uint64("nonce", tx.Nonce()),
				)
			} else {
				b.logger.Warn("Transaction found but not pending and no receipt",
					zap.String("tx_hash", txHashStr),
					zap.Uint64("nonce", tx.Nonce()),
				)
			}
			return status, nil
		}

		// 交易完全不存在
		b.logger.Warn("Transaction not found in network",
			zap.String("tx_hash", txHashStr),
			zap.String("reason", "may have been dropped or never sent"),
		)
		return status, nil
	}

	// 3. 其他错误
	return nil, fmt.Errorf("failed to check transaction status: %w", err)
}

// estimateGas estimates gas needed for the transaction
func (b *BlockchainTokenIssuer) estimateGas(ctx context.Context, to common.Address, data []byte) (uint64, error) {
	msg := ethereum.CallMsg{
		From:     b.fromAddress,
		To:       &b.tokenAddress,
		Gas:      0,
		GasPrice: nil,
		Value:    big.NewInt(0),
		Data:     data,
	}

	gasLimit, err := b.client.EstimateGas(ctx, msg)
	if err != nil {
		return 0, fmt.Errorf("failed to estimate gas: %w", err)
	}

	return gasLimit, nil
}

// waitForTransactionReceipt waits for transaction to be mined with retry logic
func (b *BlockchainTokenIssuer) waitForTransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	// Maximum wait time: 2 minutes (Polygon blocks are ~2 seconds)
	timeout := 2 * time.Minute
	pollInterval := 3 * time.Second

	deadline := time.Now().Add(timeout)
	attempts := 0

	for time.Now().Before(deadline) {
		attempts++

		receipt, err := b.client.TransactionReceipt(ctx, txHash)
		if err == nil {
			// Transaction found and mined
			b.logger.Info("Transaction confirmed",
				zap.String("tx_hash", txHash.Hex()),
				zap.Uint64("block", receipt.BlockNumber.Uint64()),
				zap.Int("attempts", attempts),
			)
			return receipt, nil
		}

		// If error is "not found", transaction is still pending
		if strings.Contains(err.Error(), "not found") {
			// Every 10 attempts (~30 seconds), verify transaction is still in mempool
			if attempts%10 == 0 {
				tx, isPending, checkErr := b.client.TransactionByHash(ctx, txHash)
				if checkErr != nil {
					// Transaction not found - could be RPC delay or transaction dropped
					b.logger.Warn("Cannot verify transaction in mempool, will keep waiting",
						zap.String("tx_hash", txHash.Hex()),
						zap.Error(checkErr),
						zap.Int("attempts", attempts),
						zap.String("hint", "This is normal during network congestion or RPC sync delays"),
					)
					// Don't fail - just continue waiting
				} else {
					if !isPending {
						// Transaction is no longer pending, check if it's confirmed or dropped
						b.logger.Warn("Transaction no longer pending but not confirmed yet",
							zap.String("tx_hash", txHash.Hex()),
							zap.Uint64("nonce", tx.Nonce()),
						)

						// Check current pending nonce to see if this transaction was replaced
						currentNonce, nonceErr := b.client.PendingNonceAt(ctx, b.fromAddress)
						if nonceErr == nil {
							if currentNonce > tx.Nonce() {
								b.logger.Error("Transaction replaced by another transaction",
									zap.String("tx_hash", txHash.Hex()),
									zap.Uint64("tx_nonce", tx.Nonce()),
									zap.Uint64("current_nonce", currentNonce),
								)
								return nil, fmt.Errorf("transaction was replaced (nonce %d, current %d)", tx.Nonce(), currentNonce)
							}
						}
					} else {
						b.logger.Info("Transaction still in mempool",
							zap.String("tx_hash", txHash.Hex()),
							zap.Bool("is_pending", isPending),
							zap.Int("wait_attempts", attempts),
						)
					}
				}
			} else {
				b.logger.Debug("Transaction pending, waiting...",
					zap.String("tx_hash", txHash.Hex()),
					zap.Int("attempt", attempts),
				)
			}

			time.Sleep(pollInterval)
			continue
		}

		// Other errors
		b.logger.Error("Error checking transaction receipt",
			zap.String("tx_hash", txHash.Hex()),
			zap.Error(err),
		)
		return nil, fmt.Errorf("failed to get transaction receipt: %w", err)
	}

	// Timeout reached - provide detailed diagnostic
	b.logger.Error("Transaction timeout - never confirmed",
		zap.String("tx_hash", txHash.Hex()),
		zap.Duration("timeout", timeout),
		zap.Int("total_attempts", attempts),
		zap.String("diagnosis", "Check Polygonscan for transaction status"),
		zap.String("polygonscan_url", fmt.Sprintf("https://polygonscan.com/tx/%s", txHash.Hex())),
	)

	// Try one last check to see if transaction is still in mempool
	_, isPending, err := b.client.TransactionByHash(ctx, txHash)
	if err != nil {
		return nil, fmt.Errorf("transaction timeout and disappeared from network (may be dropped)")
	}

	if isPending {
		return nil, fmt.Errorf("transaction still pending after %v - likely stuck due to network congestion or gas price too low", timeout)
	}

	return nil, fmt.Errorf("transaction not mined within timeout period")
}

// getBaseFee gets the base fee from the latest block for EIP-1559
func (b *BlockchainTokenIssuer) getBaseFee(ctx context.Context) (*big.Int, error) {
	block, err := b.client.BlockByNumber(ctx, nil) // nil = latest block
	if err != nil {
		return nil, fmt.Errorf("failed to get latest block: %w", err)
	}

	if block.BaseFee() == nil {
		return nil, fmt.Errorf("base fee not available (chain may not support EIP-1559)")
	}

	return block.BaseFee(), nil
}

// sendLegacyTransaction sends a legacy (pre-EIP-1559) transaction as fallback
func (b *BlockchainTokenIssuer) sendLegacyTransaction(ctx context.Context, to common.Address, data []byte, nonce uint64, gasLimit uint64, balance *big.Int) (string, error) {
	b.logger.Info("Using legacy transaction type")

	// Get gas price
	gasPrice, err := b.client.SuggestGasPrice(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get gas price: %w", err)
	}

	// Multiply by 1.2 for faster inclusion
	multiplier := big.NewInt(12)
	gasPrice = new(big.Int).Mul(gasPrice, multiplier)
	gasPrice = new(big.Int).Div(gasPrice, big.NewInt(10))

	b.logger.Info("Legacy gas price calculated",
		zap.String("gas_price_wei", gasPrice.String()),
	)

	// Calculate cost
	gasCost := new(big.Int).Mul(gasPrice, new(big.Int).SetUint64(gasLimit))
	b.logger.Info("Transaction cost estimate (Legacy)",
		zap.String("gas_cost_wei", gasCost.String()),
		zap.String("sender_balance_wei", balance.String()),
	)

	// Create legacy transaction
	tx := types.NewTx(&types.LegacyTx{
		Nonce:    nonce,
		To:       &b.tokenAddress, // IMPORTANT: calling token contract, not recipient
		Value:    big.NewInt(0),
		Gas:      gasLimit,
		GasPrice: gasPrice,
		Data:     data,
	})

	b.logger.Info("Legacy transaction created",
		zap.String("to", tx.To().Hex()),
		zap.Uint64("nonce", tx.Nonce()),
		zap.Uint64("gas", tx.Gas()),
		zap.String("gas_price", gasPrice.String()),
		zap.String("type", "Legacy"),
	)

	// Sign transaction
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(b.chainID), b.privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %w", err)
	}

	b.logger.Info("Transaction signed", zap.String("tx_hash", signedTx.Hash().Hex()))

	// Send transaction
	err = b.client.SendTransaction(ctx, signedTx)
	if err != nil {
		b.logger.Error("Failed to send transaction to network",
			zap.String("tx_hash", signedTx.Hash().Hex()),
			zap.Error(err),
		)
		return "", fmt.Errorf("failed to send transaction: %w", err)
	}

	txHash := signedTx.Hash().Hex()

	// Verify transaction is in mempool
	time.Sleep(500 * time.Millisecond)
	_, isPending, err := b.client.TransactionByHash(ctx, signedTx.Hash())
	if err != nil {
		b.logger.Error("Transaction sent but cannot be found in network",
			zap.String("tx_hash", txHash),
			zap.Error(err),
		)
		return "", fmt.Errorf("transaction sent but not found in network: %w", err)
	}

	b.logger.Info("Transaction sent to network and verified in mempool",
		zap.String("tx_hash", txHash),
		zap.Bool("in_mempool", isPending),
	)

	// Wait for confirmation
	receipt, err := b.waitForTransactionReceipt(ctx, signedTx.Hash())
	if err != nil {
		b.logger.Error("Transaction sent but failed to confirm",
			zap.String("tx_hash", txHash),
			zap.Error(err),
		)
		return "", fmt.Errorf("transaction sent but not confirmed: %w", err)
	}

	// Check if transaction succeeded
	if receipt.Status != types.ReceiptStatusSuccessful {
		b.logger.Error("Transaction confirmed but failed on chain",
			zap.String("tx_hash", txHash),
			zap.Uint64("status", receipt.Status),
		)
		return "", fmt.Errorf("transaction failed on chain, tx_hash: %s, status: %d", txHash, receipt.Status)
	}

	b.logger.Info("Token issuance transaction confirmed successfully",
		zap.String("tx_hash", txHash),
		zap.Uint64("block_number", receipt.BlockNumber.Uint64()),
		zap.Uint64("gas_used", receipt.GasUsed),
	)

	return txHash, nil
}

// WaitForConfirmation waits for transaction confirmation (optional feature)
func (b *BlockchainTokenIssuer) WaitForConfirmation(ctx context.Context, txHash string, confirmBlocks uint64) (*types.Receipt, error) {
	hash := common.HexToHash(txHash)

	// Wait for transaction to be mined
	receipt, err := b.client.TransactionReceipt(ctx, hash)
	if err != nil {
		return nil, fmt.Errorf("failed to get receipt: %w", err)
	}

	// Check transaction status
	if receipt.Status != types.ReceiptStatusSuccessful {
		return nil, fmt.Errorf("transaction failed with status: %d", receipt.Status)
	}

	b.logger.Info("Transaction confirmed",
		zap.String("tx_hash", txHash),
		zap.Uint64("block_number", receipt.BlockNumber.Uint64()),
		zap.Uint64("status", receipt.Status),
	)

	return receipt, nil
}

// Close closes client connection
func (b *BlockchainTokenIssuer) Close() {
	if b.client != nil {
		b.client.Close()
	}
}

// GetBalance queries token balance (helper function)
func (b *BlockchainTokenIssuer) GetBalance(ctx context.Context, address string) (*big.Int, error) {
	addr := common.HexToAddress(address)

	// balanceOf(address) ABI
	balanceOfABI := `[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}]`
	parsedABI, err := abi.JSON(strings.NewReader(balanceOfABI))
	if err != nil {
		return nil, fmt.Errorf("failed to parse balanceOf ABI: %w", err)
	}

	data, err := parsedABI.Pack("balanceOf", addr)
	if err != nil {
		return nil, fmt.Errorf("failed to pack balanceOf data: %w", err)
	}

	msg := ethereum.CallMsg{
		To:   &b.tokenAddress,
		Data: data,
	}

	result, err := b.client.CallContract(ctx, msg, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to call balanceOf: %w", err)
	}

	balance := new(big.Int)
	balance.SetBytes(result)

	return balance, nil
}
