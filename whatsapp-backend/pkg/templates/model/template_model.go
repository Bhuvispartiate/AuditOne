package template_model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MessageTemplate struct {
	Id        string    `json:"id" gorm:"type:uuid;primaryKey"`
	Name      string    `json:"name" gorm:"uniqueIndex"`
	Content   string    `json:"content" gorm:"type:text"`
	IsActive  bool      `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (t *MessageTemplate) BeforeCreate(tx *gorm.DB) (err error) {
	if t.Id == "" {
		t.Id = uuid.New().String()
	}
	return
}
