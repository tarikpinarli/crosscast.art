package handlers

import (
	"path/filepath"
	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/paymentintent"
	"github.com/tarikpinarli/dualSculp-backend/config"
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

// CHECK AVAILABILITY (MOCKED)
// Always returns true so the frontend allows the user to proceed to payment.
func (h *Handler) CheckAvailability(c *gin.Context) {
	// We simulate a healthy balance
	c.JSON(200, gin.H{"available": true, "balance": 9999})
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