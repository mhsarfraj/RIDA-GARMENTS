# Data dictionary

The Google Sheet tab names and header order must match `Code.gs`.

- **Products**: ProductID, SKU, Name, Category, Description, Price, OriginalPrice, Images, Sizes, Colors, Material, Care, Stock, LowStock, Status, NewArrival, BestSeller, CreatedAt, UpdatedAt. `Images`, `Sizes`, and `Colors` are comma-separated strings.
- **Settings**: SettingKey, SettingValue, UpdatedAt. Use the keys listed in `SETTING_KEYS` in Code.gs.
- **Enquiries**: EnquiryID, CustomerName, Phone, Type, ProductID, Message, Status, AdminNotes, CreatedAt, UpdatedAt.
- **Customers**: CustomerID, Name, Phone, Email, City, Tags, Notes, Source, Stage, TotalSpent, NextFollowUp, LastContact, CreatedAt, UpdatedAt.
- **InventoryHistory** and **ActivityLogs** are written by the backend.
- **CustomerNotes** stores customer interaction timeline notes.

Do not change header names/order without updating the backend. Phone numbers should be text to preserve leading digits.
