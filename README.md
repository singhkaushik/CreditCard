# Loan Management API

The Loan Management API is a Node.js-based application that provides functionality for registering customers, checking loan eligibility, creating loans, viewing loan details, making loan payments, and viewing loan statements. This API is designed to manage customer data, assess loan eligibility, and enable loan-related operations.

## Endpoints

### 1. Register a Customer

- **Endpoint:** `POST /register`
- **Description:** Registers a new customer or updates existing customer information if already registered.
- **Request Body:**
  - `first_name`: First name of the customer.
  - `last_name`: Last name of the customer.
  - `age`: Age of the customer.
  - `phone_number`: Customer's phone number.
  - `monthly_salary`: Customer's monthly salary.
- **Response:**
  - 201 Created: Customer created successfully.
  - 200 OK: Customer information updated successfully.
  - 500 Internal Server Error: Registration failed.

### 2. Check Loan Eligibility

- **Endpoint:** `POST /check-eligibility`
- **Description:** Determines whether a customer is eligible for a loan and provides loan details.
- **Request Body:**
  - `customer_id`: ID of the customer.
  - `loan_amount`: Desired loan amount.
  - `interest_rate`: Interest rate for the loan.
  - `tenure`: Loan tenure in months.
- **Response:**
  - 201 Created: Loan application submitted successfully.
  - 200 OK: Loan application submitted successfully.
  - 404 Not Found: Customer not found.
  - 500 Internal Server Error: Application failed.

### 3. Create a Loan

- **Endpoint:** `POST /create-loan`
- **Description:** Creates a new loan for an eligible customer.
- **Request Body:**
  - `customer_id`: ID of the customer.
  - `loan_amount`: Desired loan amount.
  - `interest_rate`: Interest rate for the loan.
  - `tenure`: Loan tenure in months.
- **Response:**
  - 201 Created: Loan approved and created successfully.
  - 200 OK: Loan not approved.
  - 404 Not Found: Customer not found.
  - 500 Internal Server Error: Loan creation failed.

### 4. View Loan Details

- **Endpoint:** `GET /view-loan/:loan_id`
- **Description:** Retrieves loan details for a specific loan ID.
- **Request Params:**
  - `loan_id`: ID of the loan to view.
- **Response:**
  - 200 OK: Successfully retrieved loan details.
  - 404 Not Found: Loan not found.
  - 400 Bad Request: Invalid `loan_id` provided.
  - 500 Internal Server Error: An unexpected error occurred.

### 5. Make Loan Payment

- **Endpoint:** `POST /make-payment/:customer_id/:loan_id`
- **Description:** Allows a customer to make a payment for a loan installment.
- **Request Params:**
  - `customer_id`: ID of the customer.
  - `loan_id`: ID of the loan.
- **Request Body:**
  - `amountPaid`: Amount to be paid for the installment.
- **Response:**
  - 200 OK: Payment successful.
  - 404 Not Found: Loan not found for the customer.
  - 500 Internal Server Error: An unexpected error occurred.

### 6. View Loan Statement

- **Endpoint:** `GET /view-statement/:customer_id/:loan_id`
- **Description:** Retrieves a statement that includes loan details and payment history for a specific customer and loan.
- **Request Params:**
  - `customer_id`: ID of the customer.
  - `loan_id`: ID of the loan.
- **Response:**
  - 200 OK: Successfully retrieved the statement.
  - 404 Not Found: Loan not found for the customer.
  - 500 Internal Server Error: An unexpected error occurred.

## Database Configuration

- The API uses a database connection for customer and loan management. You should configure your database connection settings in the `dbConnect.js` file.

## Error Handling

- The API provides error responses with appropriate status codes and error messages for various scenarios.

## Dependencies

- The API relies on various npm packages, including Express, email-validator, bcrypt, and others. You need to install these packages before running the API.

## Getting Started

1. Install Node.js and npm.
2. Clone this repository.
3. Install dependencies using `npm install`.
4. Configure your database connection in `dbConnect.js`.
5. Run the API using `npm start`.

## API Usage

- You can use tools like Postman or curl to interact with the API by sending HTTP requests to the provided endpoints.

## Contributing

- Contributions to this project are welcome. Feel free to submit pull requests or open issues for any improvements or bug fixes.

## License

- This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.