# Data Model – Cafeteria Pre-Order App

This document defines the data structures used in the cloud-native application (AWS Lambda + DynamoDB + API Gateway). This is Step 1 (Design) before creating AWS resources.

---

## 1. DynamoDB Table: MenuItems

**Table Name:** MenuItems  
**Primary Key:** itemId (String)

### Attributes:
- itemId: String (PK)
- name: String
- description: String
- price: Number
- mealType: String ("breakfast", "lunch", "dinner")
- available: Boolean

MenuItems holds the static menu that the frontend displays.



---

## 2. DynamoDB Table: Orders

**Table Name:** Orders  
**Primary Key:** orderId (String)

### Attributes:
- orderId: String (PK)
- userId: String
- items: List of Objects  
  - itemId, name, quantity, price
- totalPrice: Number
- status: String ("Placed", "Accepted", "Ready", "Collected")
- createdAt: String (ISO timestamp)

### Secondary Index (optional but recommended):
**GSI_UserOrders**
- Partition Key: userId
- Sort Key: createdAt

The Orders table stores user pre-orders and their status.

---

## Notes:
- This design will be used when creating DynamoDB tables in AWS.
- Lambda functions will read/write using this structure.
- The frontend JavaScript will integrate with the API Gateway endpoints.
