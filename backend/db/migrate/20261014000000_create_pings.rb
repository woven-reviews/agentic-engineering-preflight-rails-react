class CreatePings < ActiveRecord::Migration[8.1]
  def change
    create_table :pings do |table|
      table.string :message, null: false
      table.timestamps
    end
  end
end
