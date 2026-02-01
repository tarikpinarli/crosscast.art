package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/tarikpinarli/dualSculp-backend/internal/database"
	"github.com/tarikpinarli/dualSculp-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// --- STRUCTS ---

type RegisterInput struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// --- HANDLERS ---

// 1. REGISTER
func (h *Handler) Register(c *gin.Context) {
	var input RegisterInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	passwordStr := string(hashedPassword)
	user := models.User{
		Email:        input.Email,
		Password:     &passwordStr,
		AuthProvider: "email",
	}

	result := database.DB.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already registered"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user": gin.H{
			"email":   user.Email,
			"credits": user.Credits,
		},
	})
}

// 2. LOGIN
func (h *Handler) Login(c *gin.Context) {
	var input LoginInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	var user models.User
	result := database.DB.Where("email = ?", input.Email).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if user.Password == nil || bcrypt.CompareHashAndPassword([]byte(*user.Password), []byte(input.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate Token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.ID,
		"exp": time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(h.Config.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"email":   user.Email,
			"credits": user.Credits,
		},
	})
}