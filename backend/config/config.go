package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Server     ServerConfig     `mapstructure:"server"`
	Database   DatabaseConfig   `mapstructure:"database"`
	Redis      RedisConfig      `mapstructure:"redis"`
	JWT        JWTConfig        `mapstructure:"jwt"`
	Log        LogConfig        `mapstructure:"log"`
	X402       X402Config       `mapstructure:"x402"`
	CheckIn    CheckInConfig    `mapstructure:"checkin"`
	Blockchain BlockchainConfig `mapstructure:"blockchain"`
}

type ServerConfig struct {
	Host string `mapstructure:"host"`
	Port int    `mapstructure:"port"`
	Env  string `mapstructure:"env"`
}

type DatabaseConfig struct {
	Host            string `mapstructure:"host"`
	Port            int    `mapstructure:"port"`
	User            string `mapstructure:"user"`
	Password        string `mapstructure:"password"`
	DBName          string `mapstructure:"dbname"`
	SSLMode         string `mapstructure:"sslmode"`
	MaxIdleConns    int    `mapstructure:"max_idle_conns"`
	MaxOpenConns    int    `mapstructure:"max_open_conns"`
	ConnMaxLifetime int    `mapstructure:"conn_max_lifetime"`
}

type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
	PoolSize int    `mapstructure:"pool_size"`
}

type JWTConfig struct {
	Secret     string `mapstructure:"secret"`
	ExpireHour int    `mapstructure:"expire_hour"`
}

type LogConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}

type X402Config struct {
	BaseURL    string `mapstructure:"base_url"`
	APIToken   string `mapstructure:"api_token"`
	MerchantID string `mapstructure:"merchant_id"`
}

type CheckInConfig struct {
	PriceAmount    string `mapstructure:"price_amount"`    // "1.0"
	BlockchainType int    `mapstructure:"blockchain_type"` // 2 = Polygon
	TokenSymbol    string `mapstructure:"token_symbol"`    // "USDT"
	RewardAmount   string `mapstructure:"reward_amount"`   // "10"  (10 DeData tokens)
	WorkerInterval int    `mapstructure:"worker_interval"` // worker 轮询间隔（秒）
	MaxRetryCount  int    `mapstructure:"max_retry_count"` // 最大重试次数
}

type BlockchainConfig struct {
	ChainID       int64  `mapstructure:"chain_id"`       // 链ID (Polygon=137, Polygon Mumbai=80001)
	RPCURL        string `mapstructure:"rpc_url"`        // RPC节点地址
	PrivateKey    string `mapstructure:"private_key"`    // 私钥 (用于签名交易)
	TokenAddress  string `mapstructure:"token_address"`  // DeData Token合约地址
	GasLimit      uint64 `mapstructure:"gas_limit"`      // Gas限制 (默认100000)
	MaxGasPrice   int64  `mapstructure:"max_gas_price"`  // 最大Gas价格 (Gwei)
	ConfirmBlocks uint64 `mapstructure:"confirm_blocks"` // 等待确认的区块数
}

// Load 加载配置文件
// 优先级: 环境变量 > YAML 配置文件
func Load() (*Config, error) {
	// 1. 获取运行环境 (默认 development)
	env := os.Getenv("GO_ENV")
	if env == "" {
		env = "development"
	}

	// 2. 配置 viper
	v := viper.New()
	v.SetConfigName(fmt.Sprintf("config.%s", env)) // config.development.yaml
	v.SetConfigType("yaml")
	v.AddConfigPath("./config")     // 当前目录的 config 文件夹
	v.AddConfigPath("../config")    // 上级目录的 config 文件夹
	v.AddConfigPath("../../config") // 上上级目录
	v.AddConfigPath("/etc/dedata")  // 系统配置目录

	// 3. 读取配置文件
	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// 4. 环境变量覆盖 (支持 ${VAR} 语法)
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// 5. 解析到结构体
	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &cfg, nil
}

// GetDSN 返回数据库连接字符串
func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode)
}

// GetRedisAddr 返回 Redis 地址
func (c *RedisConfig) GetRedisAddr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}
