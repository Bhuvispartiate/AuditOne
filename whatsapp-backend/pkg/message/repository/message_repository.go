package message_repository

import (
	"time"

	message_model "github.com/evolution-foundation/evolution-go/pkg/message/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type MessageRepository interface {
	InsertMessage(message message_model.Message) error
	CreateLog(message *message_model.Message) error
	GetMessageByID(messageID string) (*message_model.Message, error)
	GetByIdempotencyKey(idempotencyKey string) (*message_model.Message, error)
	UpdateMessageStatus(id string, status string, whatsappMessageID string, errorMessage string) error
	DeleteAllMessages() (int64, error)
	GetLatestMessageID(source string) (string, string, error)
}

type messageRepository struct {
	db *gorm.DB
}

func messageUpdateColumns(message message_model.Message) []string {
	updates := []string{"timestamp", "status", "source", "phone", "message_content", "whatsapp_message_id", "error_message"}
	if len(message.Referral) > 0 {
		updates = append(updates, "referral")
	}

	return updates
}

func (m *messageRepository) InsertMessage(message message_model.Message) error {
	return m.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "message_id"}},
		DoUpdates: clause.AssignmentColumns(messageUpdateColumns(message)),
	}).Create(&message).Error
}

func (m *messageRepository) CreateLog(message *message_model.Message) error {
	return m.db.Create(message).Error
}

func (m *messageRepository) GetMessageByID(messageID string) (*message_model.Message, error) {
	var message message_model.Message
	err := m.db.Where("message_id = ? OR id = ?", messageID, messageID).First(&message).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return &message, nil
}

func (m *messageRepository) GetByIdempotencyKey(idempotencyKey string) (*message_model.Message, error) {
	if idempotencyKey == "" {
		return nil, nil
	}
	var message message_model.Message
	err := m.db.Where("idempotency_key = ?", idempotencyKey).First(&message).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return &message, nil
}

func (m *messageRepository) UpdateMessageStatus(id string, status string, whatsappMessageID string, errorMessage string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	now := time.Now()
	if status == "SENT" {
		updates["sent_at"] = &now
	} else if status == "DELIVERED" {
		updates["delivered_at"] = &now
	} else if status == "FAILED" {
		updates["failed_at"] = &now
	}

	if whatsappMessageID != "" {
		updates["whatsapp_message_id"] = whatsappMessageID
	}
	if errorMessage != "" {
		updates["error_message"] = errorMessage
	}

	return m.db.Model(&message_model.Message{}).Where("id = ? OR message_id = ?", id, id).Updates(updates).Error
}

func (m *messageRepository) DeleteAllMessages() (int64, error) {
	result := m.db.Exec("DELETE FROM messages")
	return result.RowsAffected, result.Error
}

func (m *messageRepository) GetLatestMessageID(source string) (string, string, error) {
	var message message_model.Message
	err := m.db.Where("source = ?", source).Order("created_at DESC").First(&message).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", "", nil
		}
		return "", "", err
	}

	return message.MessageID, message.Timestamp, nil
}

func NewMessageRepository(db *gorm.DB) MessageRepository {
	return &messageRepository{db: db}
}
