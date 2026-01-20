package crypto

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
)

// GenerateNonce 生成随机 nonce
func GenerateNonce() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// VerifySignature 验证以太坊签名
// message: 原始消息
// signature: 签名 (0x... 格式)
// expectedAddress: 期望的签名者地址
func VerifySignature(message, signature, expectedAddress string) (bool, error) {
	// 1. 清理地址格式
	expectedAddress = strings.ToLower(strings.TrimSpace(expectedAddress))
	if !strings.HasPrefix(expectedAddress, "0x") {
		expectedAddress = "0x" + expectedAddress
	}

	// 2. 验证地址格式
	if !common.IsHexAddress(expectedAddress) {
		return false, fmt.Errorf("invalid address format")
	}

	// 3. 计算消息哈希 (以太坊标准格式: \x19Ethereum Signed Message:\n + len + message)
	prefixedMessage := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)
	prefixedHash := crypto.Keccak256Hash([]byte(prefixedMessage))

	// 4. 解码签名
	sigBytes, err := hexutil.Decode(signature)
	if err != nil {
		return false, fmt.Errorf("invalid signature format: %w", err)
	}

	if len(sigBytes) != 65 {
		return false, fmt.Errorf("invalid signature length: %d", len(sigBytes))
	}

	// 5. 处理 v 值 (某些钱包会返回 27/28, 需要转换为 0/1)
	if sigBytes[64] >= 27 {
		sigBytes[64] -= 27
	}

	// 6. 恢复公钥
	pubKey, err := crypto.SigToPub(prefixedHash.Bytes(), sigBytes)
	if err != nil {
		return false, fmt.Errorf("failed to recover public key: %w", err)
	}

	// 7. 从公钥计算地址
	recoveredAddr := crypto.PubkeyToAddress(*pubKey)

	// 8. 比较地址 (不区分大小写)
	expected := common.HexToAddress(expectedAddress)
	return bytes.Equal(recoveredAddr.Bytes(), expected.Bytes()), nil
}

// RecoverAddress 从签名中恢复地址
func RecoverAddress(message, signature string) (string, error) {
	// 1. 计算 prefixed hash
	prefixedMessage := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)
	prefixedHash := crypto.Keccak256Hash([]byte(prefixedMessage))

	// 2. 解码签名
	sigBytes, err := hexutil.Decode(signature)
	if err != nil {
		return "", fmt.Errorf("invalid signature format: %w", err)
	}

	if len(sigBytes) != 65 {
		return "", fmt.Errorf("invalid signature length: %d", len(sigBytes))
	}

	// 3. 处理 v 值
	if sigBytes[64] >= 27 {
		sigBytes[64] -= 27
	}

	// 4. 恢复公钥
	pubKey, err := crypto.SigToPub(prefixedHash.Bytes(), sigBytes)
	if err != nil {
		return "", fmt.Errorf("failed to recover public key: %w", err)
	}

	// 5. 计算地址
	recoveredAddr := crypto.PubkeyToAddress(*pubKey)
	return recoveredAddr.Hex(), nil
}
