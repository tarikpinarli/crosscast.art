package handlers

import (
    "net/http"
    "path/filepath"
    "github.com/gin-gonic/gin"
    "github.com/stripe/stripe-go/v76"
    "github.com/stripe/stripe-go/v76/paymentintent"
    "github.com/tarikpinarli/dualSculp-backend/config"
    "github.com/tarikpinarli/dualSculp-backend/internal/services"
)

var ModulePrices = map[string]int64{
    "intersection-basic": 99,
    "replicator-model":   299,
}

type Handler struct { Config *config.Config }

func NewHandler(cfg *config.Config) *Handler {
    stripe.Key = cfg.StripeSecretKey
    return &Handler{Config: cfg}
}

func (h *Handler) CheckAvailability(c *gin.Context) {
    credits, err := services.CheckTripoCredits(h.Config)
    if err != nil {
        c.JSON(200, gin.H{"available": false, "reason": "api_error"})
        return
    }
    if credits >= 30 { 
        c.JSON(200, gin.H{"available": true, "balance": credits})
    } else {
        c.JSON(200, gin.H{"available": false, "reason": "insufficient_credits"})
    }
}

func (h *Handler) CreatePaymentIntent(c *gin.Context) {
    var body struct { ModuleID string `json:"moduleId"` }
    c.BindJSON(&body)

    amount := ModulePrices[body.ModuleID]
    if amount == 0 { amount = 299 }

    params := &stripe.PaymentIntentParams{
        Amount: stripe.Int64(amount),
        Currency: stripe.String(string(stripe.CurrencyUSD)),
        AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{Enabled: stripe.Bool(true)},
    }
    pi, err := paymentintent.New(params)
    if err != nil {
        c.JSON(403, gin.H{"error": err.Error()})
        return
    }
    c.JSON(200, gin.H{"clientSecret": pi.ClientSecret})
}

func (h *Handler) ServeFiles(c *gin.Context) {
    roomID := c.Param("room_id")
    filename := c.Param("filename")
    c.File(filepath.Join(h.Config.UploadFolder, roomID, filename))
}