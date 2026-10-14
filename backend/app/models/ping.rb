class Ping < ApplicationRecord
  validates :message, presence: true
end
