class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :line_user_id
      t.string :name
      t.string :avatar_url

      t.timestamps
    end
    add_index :users, :line_user_id
  end
end
