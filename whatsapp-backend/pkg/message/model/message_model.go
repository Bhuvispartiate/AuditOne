package message_model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Message struct {
	Id                 string          `json:"id" gorm:"type:uuid;primaryKey"`
	MessageID          string          `json:"message_id" gorm:"index"`
	Phone              string          `json:"phone" gorm:"index"`
	MessageContent     string          `json:"message_content" gorm:"type:text"`
	TemplateName       string          `json:"template_name,omitempty" gorm:"index"`
	Source             string          `json:"source" gorm:"index"`
	ReferenceID        string          `json:"reference_id,omitempty" gorm:"index"`
	IdempotencyKey     string          `json:"idempotency_key,omitempty" gorm:"uniqueIndex"`
	Status             string          `json:"status" gorm:"index"` // PENDING, PROCESSING, SENT, DELIVERED, FAILED, DUPLICATE
	WhatsappInstanceID string          `json:"whatsapp_instance_id,omitempty" gorm:"index"`
	WhatsappMessageID  string          `json:"whatsapp_message_id,omitempty" gorm:"index"`
	ErrorMessage       string          `json:"error_message,omitempty" gorm:"type:text"`
	Timestamp          string          `json:"timestamp,omitempty"`
	Referral           json.RawMessage `json:"referral,omitempty" gorm:"type:jsonb"`
	CreatedAt          time.Time       `json:"created_at" gorm:"autoCreateTime"`
	SentAt             *time.Time      `json:"sent_at,omitempty"`
	DeliveredAt        *time.Time      `json:"delivered_at,omitempty"`
	FailedAt           *time.Time      `json:"failed_at,omitempty"`
}

func (m *Message) BeforeCreate(tx *gorm.DB) (err error) {
	if m.Id == "" {
		m.Id = uuid.New().String()
	}
	if m.MessageID == "" {
		m.MessageID = m.Id
	}
	return
}
