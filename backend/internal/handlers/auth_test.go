package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/tarikpinarli/dualSculp-backend/config"
)

// Helper to setup router
func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	return r
}

func TestRegisterInputValidation(t *testing.T) {
	// 1. Setup
	r := setupRouter()
	cfg := &config.Config{JWTSecret: "test_secret"}
	h := &Handler{Config: cfg}
	r.POST("/signup", h.Register)

	// 2. Create Request with BAD JSON (Missing Password)
	jsonBody := []byte(`{"email": "badrequest@test.com"}`)
	req, _ := http.NewRequest("POST", "/signup", bytes.NewBuffer(jsonBody))
	w := httptest.NewRecorder()

	// 3. Run
	r.ServeHTTP(w, req)

	// 4. Assert
	assert.Equal(t, http.StatusBadRequest, w.Code) // Should fail with 400
}