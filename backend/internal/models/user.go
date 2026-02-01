package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model

	// Core Identity
	Email string `gorm:"uniqueIndex;not null" json:"email"`

	// Auth Data (Pointer allows nulls for Google/Apple users)
	Password *string `json:"-"`

	// Scalability Fields
	AuthProvider string `gorm:"default:'email'" json:"auth_provider"` // "email", "google", "apple"
	ProviderID   string `json:"-"`                                     // The unique ID from Google/Apple

	// Economy System
	Credits int64 `gorm:"default:0" json:"credits"` // Tracks user balance

	// Profile
	AvatarURL string `json:"avatar_url"`
}

// Hook: Run logic before creating a user (e.g., give starter credits)
func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.Credits == 0 {
		u.Credits = 10 // Give 10 free credits to every new user
	}
	return
}