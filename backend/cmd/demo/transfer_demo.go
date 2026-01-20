package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

const (
	// Polygon RPC
	rpcURL = "https://polygon-rpc.com"

	// 你的配置
	privateKeyHex = "118639d79a60e20e02cdde6eb71e3fb90c21a02e39d995055690bd93c33bdc99" // 替换为你的私钥
	tokenAddress  = "0x0f17A994aa42a9E42584BAF0246B973D1C641FFd"                       // DEDATA token
	recipientAddr = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"                       // 接收者地址

	// 转账金额 (0.01 token, 假设18位小数)
	transferAmount = "10000000000000000" // 0.01 * 10^18
)

// ERC20 ABI for transfer function
const erc20ABI = `[{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}]`

func main() {
	ctx := context.Background()

	fmt.Println("=== ERC20 Transfer Demo ===")
	fmt.Println("RPC URL:", rpcURL)
	fmt.Println("Token Address:", tokenAddress)
	fmt.Println("Recipient:", recipientAddr)
	fmt.Println()

	// 1. 连接到 RPC
	fmt.Println("Step 1: Connecting to RPC...")
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		panic(fmt.Sprintf("Failed to connect to RPC: %v", err))
	}
	defer client.Close()

	// 验证连接
	chainID, err := client.ChainID(ctx)
	if err != nil {
		panic(fmt.Sprintf("Failed to get chain ID: %v", err))
	}
	fmt.Printf("✓ Connected to chain ID: %d\n\n", chainID)

	// 2. 加载私钥
	fmt.Println("Step 2: Loading private key...")
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		panic(fmt.Sprintf("Failed to load private key: %v", err))
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		panic("Failed to cast public key")
	}

	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	fmt.Printf("✓ From address: %s\n\n", fromAddress.Hex())

	// 3. 检查余额
	fmt.Println("Step 3: Checking balances...")
	balance, err := client.BalanceAt(ctx, fromAddress, nil)
	if err != nil {
		panic(fmt.Sprintf("Failed to get balance: %v", err))
	}
	fmt.Printf("✓ Native balance: %s wei\n", balance.String())

	if balance.Cmp(big.NewInt(0)) == 0 {
		panic("Sender has no native token for gas fees")
	}

	// 4. 构造转账 data
	fmt.Println("\nStep 4: Encoding transfer data...")
	parsedABI, err := abi.JSON(strings.NewReader(erc20ABI))
	if err != nil {
		panic(fmt.Sprintf("Failed to parse ABI: %v", err))
	}

	recipient := common.HexToAddress(recipientAddr)
	amount := new(big.Int)
	amount.SetString(transferAmount, 10)

	data, err := parsedABI.Pack("transfer", recipient, amount)
	if err != nil {
		panic(fmt.Sprintf("Failed to pack data: %v", err))
	}
	fmt.Printf("✓ Transfer data encoded (length: %d bytes)\n", len(data))
	fmt.Printf("  Recipient: %s\n", recipient.Hex())
	fmt.Printf("  Amount: %s\n\n", amount.String())

	// 5. 获取 nonce
	fmt.Println("Step 5: Getting nonce...")
	nonce, err := client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		panic(fmt.Sprintf("Failed to get nonce: %v", err))
	}
	fmt.Printf("✓ Nonce: %d\n\n", nonce)

	// 6. 估算 gas
	fmt.Println("Step 6: Estimating gas...")
	tokenAddr := common.HexToAddress(tokenAddress)
	gasLimit, err := client.EstimateGas(ctx, ethereum.CallMsg{
		From: fromAddress,
		To:   &tokenAddr,
		Data: data,
	})
	if err != nil {
		// 如果估算失败，使用默认值
		gasLimit = 65000
		fmt.Printf("⚠ Gas estimation failed, using default: %d\n", gasLimit)
	} else {
		// 添加20%缓冲
		gasLimit = gasLimit * 120 / 100
		fmt.Printf("✓ Gas limit: %d\n", gasLimit)
	}
	fmt.Println()

	// 7. 获取 base fee
	fmt.Println("Step 7: Getting base fee for EIP-1559...")
	block, err := client.BlockByNumber(ctx, nil)
	if err != nil {
		panic(fmt.Sprintf("Failed to get latest block: %v", err))
	}

	baseFee := block.BaseFee()
	if baseFee == nil {
		panic("Base fee not available (chain may not support EIP-1559)")
	}
	fmt.Printf("✓ Base fee: %s wei (%s Gwei)\n", baseFee.String(), weiToGwei(baseFee))

	// 8. 计算 gas fees
	fmt.Println("\nStep 8: Calculating EIP-1559 gas fees...")
	maxPriorityFeePerGas := big.NewInt(35000000000) // 35 Gwei
	maxFeePerGas := new(big.Int).Mul(baseFee, big.NewInt(2))
	maxFeePerGas = new(big.Int).Add(maxFeePerGas, maxPriorityFeePerGas)

	fmt.Printf("✓ Max priority fee: %s Gwei\n", weiToGwei(maxPriorityFeePerGas))
	fmt.Printf("✓ Max fee per gas: %s Gwei\n", weiToGwei(maxFeePerGas))

	// 计算最大可能的 gas 费用
	maxGasCost := new(big.Int).Mul(maxFeePerGas, big.NewInt(int64(gasLimit)))
	fmt.Printf("✓ Max gas cost: %s wei (%s MATIC)\n\n", maxGasCost.String(), weiToEther(maxGasCost))

	// 9. 创建 EIP-1559 交易
	fmt.Println("Step 9: Creating EIP-1559 transaction...")
	tx := types.NewTx(&types.DynamicFeeTx{
		ChainID:   chainID,
		Nonce:     nonce,
		GasTipCap: maxPriorityFeePerGas,
		GasFeeCap: maxFeePerGas,
		Gas:       gasLimit,
		To:        &tokenAddr,
		Value:     big.NewInt(0),
		Data:      data,
	})
	fmt.Printf("✓ Transaction created (type: %d)\n", tx.Type())
	fmt.Printf("  To: %s\n", tx.To().Hex())
	fmt.Printf("  Gas: %d\n", tx.Gas())
	fmt.Printf("  Nonce: %d\n\n", tx.Nonce())

	// 10. 签名交易
	fmt.Println("Step 10: Signing transaction...")
	signedTx, err := types.SignTx(tx, types.LatestSignerForChainID(chainID), privateKey)
	if err != nil {
		panic(fmt.Sprintf("Failed to sign transaction: %v", err))
	}
	fmt.Printf("✓ Transaction signed\n")
	fmt.Printf("  TX Hash: %s\n\n", signedTx.Hash().Hex())

	// 11. 发送交易
	fmt.Println("Step 11: Sending transaction to network...")
	err = client.SendTransaction(ctx, signedTx)
	if err != nil {
		panic(fmt.Sprintf("Failed to send transaction: %v", err))
	}
	fmt.Printf("✓ Transaction sent!\n")
	fmt.Printf("  TX Hash: %s\n", signedTx.Hash().Hex())
	fmt.Printf("  Polygonscan: https://polygonscan.com/tx/%s\n\n", signedTx.Hash().Hex())

	// 12. 验证交易在 mempool 中
	fmt.Println("Step 12: Verifying transaction in mempool...")
	time.Sleep(500 * time.Millisecond)
	_, isPending, err := client.TransactionByHash(ctx, signedTx.Hash())
	if err != nil {
		fmt.Printf("⚠ Warning: Transaction not found in network: %v\n\n", err)
	} else {
		fmt.Printf("✓ Transaction found in network (pending: %v)\n\n", isPending)
	}

	// 13. 等待确认
	fmt.Println("Step 13: Waiting for confirmation...")
	fmt.Println("(This may take 5-30 seconds on Polygon)")

	receipt, err := waitForReceipt(ctx, client, signedTx.Hash(), 60*time.Second)
	if err != nil {
		panic(fmt.Sprintf("Failed to get receipt: %v", err))
	}

	// 14. 打印结果
	fmt.Println("\n=== Transaction Confirmed! ===")
	fmt.Printf("Block Number: %d\n", receipt.BlockNumber)
	fmt.Printf("Gas Used: %d\n", receipt.GasUsed)
	fmt.Printf("Effective Gas Price: %s Gwei\n", weiToGwei(receipt.EffectiveGasPrice))
	fmt.Printf("Total Gas Cost: %s MATIC\n", weiToEther(new(big.Int).Mul(receipt.EffectiveGasPrice, big.NewInt(int64(receipt.GasUsed)))))
	fmt.Printf("Status: %d ", receipt.Status)
	if receipt.Status == 1 {
		fmt.Println("(Success ✓)")
	} else {
		fmt.Println("(Failed ✗)")
	}
	fmt.Printf("\nPolygonscan: https://polygonscan.com/tx/%s\n", signedTx.Hash().Hex())
}

func waitForReceipt(ctx context.Context, client *ethclient.Client, txHash common.Hash, timeout time.Duration) (*types.Receipt, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
	，返回	select {
		case <-ctx.Done():
			return nil, fmt.Errorf("timeout waiting for transaction receipt")
		case <-ticker.C:
			receipt, err := client.TransactionReceipt(ctx, txHash)
			if err == nil {
				return receipt, nil
			}
			fmt.Print(".")
		}
	}
}

func weiToGwei(wei *big.Int) string {
	gwei := new(big.Float).Quo(
		new(big.Float).SetInt(wei),
		big.NewFloat(1e9),
	)
	return fmt.Sprintf("%.2f", gwei)
}

func weiToEther(wei *big.Int) string {
	ether := new(big.Float).Quo(
		new(big.Float).SetInt(wei),
		big.NewFloat(1e18),
	)
	return fmt.Sprintf("%.6f", ether)
}
