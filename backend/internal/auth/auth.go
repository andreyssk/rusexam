package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	RoleUser  = "user"
	RoleAdmin = "admin"
)

type Claims struct {
	UserID int64
	Role   string
}

type Tokens struct {
	secret []byte
	ttl    time.Duration
}

func NewTokens(secret string, accessTTL time.Duration) *Tokens {
	return &Tokens{secret: []byte(secret), ttl: accessTTL}
}

// NewRefreshToken returns a random opaque token and the hash that is stored in the database.
func NewRefreshToken() (raw, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	raw = base64.RawURLEncoding.EncodeToString(b)
	return raw, HashRefreshToken(raw), nil
}

func HashRefreshToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

type jwtClaims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

func (t *Tokens) Issue(userID int64, role string) (string, error) {
	now := time.Now()
	c := jwtClaims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(t.ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(t.secret)
}

func (t *Tokens) Parse(raw string) (Claims, error) {
	var c jwtClaims
	tok, err := jwt.ParseWithClaims(raw, &c, func(*jwt.Token) (any, error) { return t.secret, nil },
		jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !tok.Valid {
		return Claims{}, errors.New("invalid token")
	}
	id, err := strconv.ParseInt(c.Subject, 10, 64)
	if err != nil {
		return Claims{}, errors.New("invalid token subject")
	}
	return Claims{UserID: id, Role: c.Role}, nil
}

func HashPassword(p string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(p), bcrypt.DefaultCost)
	return string(b), err
}

func CheckPassword(hash, p string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(p)) == nil
}
