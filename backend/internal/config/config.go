package config

import (
	"errors"
	"fmt"
	"os"
	"time"
)

type Config struct {
	Port          string
	DatabaseURL   string
	JWTSecret     string
	AdminUsername string
	AdminPassword string
	SeedSamples   bool
	CookieSecure  bool
	AccessTTL     time.Duration
}

func Load() (Config, error) {
	c := Config{
		Port:          getenv("PORT", "8081"),
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		JWTSecret:     os.Getenv("JWT_SECRET"),
		AdminUsername: os.Getenv("ADMIN_USERNAME"),
		AdminPassword: os.Getenv("ADMIN_PASSWORD"),
		SeedSamples:   os.Getenv("SEED_SAMPLE_DATA") == "true",
		CookieSecure:  os.Getenv("COOKIE_SECURE") == "true",
	}
	ttl, err := time.ParseDuration(getenv("ACCESS_TOKEN_TTL", "15m"))
	if err != nil || ttl <= 0 {
		return c, fmt.Errorf("ACCESS_TOKEN_TTL must be a positive duration like 15m: %v", err)
	}
	c.AccessTTL = ttl
	switch {
	case c.DatabaseURL == "":
		return c, errors.New("DATABASE_URL is required")
	case len(c.JWTSecret) < 16:
		return c, errors.New("JWT_SECRET is required (at least 16 characters)")
	case c.AdminUsername == "" || c.AdminPassword == "":
		return c, errors.New("ADMIN_USERNAME and ADMIN_PASSWORD are required")
	}
	return c, nil
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
