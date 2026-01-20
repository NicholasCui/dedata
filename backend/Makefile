.PHONY: help migrate-up migrate-down migrate-force migrate-version migrate-create migrate-drop

# Migration tool path
MIGRATE := $(shell which migrate || echo ~/go/bin/migrate)

# Database connection strings
DB_DEV_URL := postgresql://postgres:postgres@localhost:5432/dedata_dev?sslmode=disable
DB_TEST_URL := postgresql://postgres:postgres@localhost:5432/dedata_test?sslmode=disable
DB_PROD_URL := postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:5432/$(POSTGRES_DB)?sslmode=disable

# Migration path
MIGRATIONS_PATH := ./migrations

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# Development environment migrations
migrate-up: ## Run all migrations (development)
	@echo "Running migrations on development database..."
	$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(DB_DEV_URL)" up

migrate-down: ## Rollback last migration (development)
	@echo "Rolling back last migration on development database..."
	$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(DB_DEV_URL)" down 1

migrate-force: ## Force migration to specific version (usage: make migrate-force VERSION=1)
	@echo "Forcing migration version $(VERSION)..."
	$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(DB_DEV_URL)" force $(VERSION)

migrate-version: ## Show current migration version
	@echo "Current migration version:"
	$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(DB_DEV_URL)" version

migrate-drop: ## Drop all tables (development - DANGEROUS!)
	@echo "WARNING: This will drop all tables!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(DB_DEV_URL)" drop -f; \
	fi

migrate-create: ## Create new migration (usage: make migrate-create NAME=add_users_table)
	@if [ -z "$(NAME)" ]; then \
		echo "Error: NAME is required. Usage: make migrate-create NAME=your_migration_name"; \
		exit 1; \
	fi
	@echo "Creating new migration: $(NAME)"
	$(MIGRATE) create -ext sql -dir $(MIGRATIONS_PATH) -seq $(NAME)

# Test environment migrations
migrate-up-test: ## Run migrations on test database
	@echo "Running migrations on test database..."
	$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(DB_TEST_URL)" up

migrate-down-test: ## Rollback last migration (test)
	@echo "Rolling back last migration on test database..."
	$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(DB_TEST_URL)" down 1

# Production environment migrations
migrate-up-prod: ## Run migrations on production (requires env vars)
	@if [ -z "$(POSTGRES_USER)" ] || [ -z "$(POSTGRES_PASSWORD)" ] || [ -z "$(POSTGRES_DB)" ]; then \
		echo "Error: POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB must be set"; \
		exit 1; \
	fi
	@echo "Running migrations on PRODUCTION database..."
	@read -p "Are you sure you want to migrate PRODUCTION? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(DB_PROD_URL)" up; \
	fi

# Docker commands
docker-up: ## Start development Docker containers
	docker compose -f docker-compose.dev.yml up -d

docker-down: ## Stop development Docker containers
	docker compose -f docker-compose.dev.yml down

docker-logs: ## Show Docker container logs
	docker compose -f docker-compose.dev.yml logs -f

docker-ps: ## Show Docker container status
	docker compose -f docker-compose.dev.yml ps

# Development workflow
dev-setup: docker-up migrate-up ## Setup development environment (Docker + Migrations)
	@echo "Development environment is ready!"

dev-reset: docker-down docker-up migrate-up ## Reset development environment
	@echo "Development environment has been reset!"

# Application commands
run: ## Run the application
	go run cmd/api/main.go

run-dev: ## Run with development environment
	GO_ENV=development go run cmd/api/main.go

run-test: ## Run with test environment
	GO_ENV=test go run cmd/api/main.go

build: ## Build the application
	go build -o bin/api cmd/api/main.go

test: ## Run tests
	go test -v ./...

test-coverage: ## Run tests with coverage
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Database utilities
db-connect: ## Connect to development database
	docker exec -it dedata-postgres-dev psql -U postgres -d dedata_dev

db-backup: ## Backup development database
	@mkdir -p backups
	docker exec dedata-postgres-dev pg_dump -U postgres dedata_dev > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup created in backups/"

db-restore: ## Restore database from backup (usage: make db-restore FILE=backups/backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "Error: FILE is required. Usage: make db-restore FILE=backups/backup.sql"; \
		exit 1; \
	fi
	docker exec -i dedata-postgres-dev psql -U postgres dedata_dev < $(FILE)
	@echo "Database restored from $(FILE)"

# Clean up
clean: ## Clean build artifacts
	rm -rf bin/
	rm -f coverage.out coverage.html

# Install tools
install-migrate: ## Install golang-migrate tool
	go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	@echo "golang-migrate installed successfully"
