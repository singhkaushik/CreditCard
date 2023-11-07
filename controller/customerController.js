import express from "express";
import createConnection from "../config/dbConnect.js";
import emailValidator from "email-validator";
import bcrypt from "bcrypt";

const register = async (req, res) => {
  try {
    const { first_name, last_name, age, phone_number, monthly_salary } =
      req.body;
    const connection = await createConnection();

    const approved_limit = Math.round((36 * monthly_salary) / 100000) * 100000;

    const [existingRows] = await connection.execute(
      "SELECT * FROM customer WHERE first_name = ? AND last_name = ? AND phone_number = ?",
      [first_name, last_name, phone_number]
    );

    if (existingRows.length > 0) {
      const customer = existingRows[0];
      const customer_id = customer.customer_id;

      if (customer.monthly_salary !== monthly_salary || customer.age !== age) {
        await connection.execute(
          "UPDATE customer SET monthly_salary = ?, age = ?, approved_limit = ? WHERE customer_id = ?",
          [monthly_salary, age, approved_limit, customer_id]
        );
      }

      const updatedCustomer = {
        Customer_id: customer_id,
        name: `${first_name} ${last_name}`,
        Age: age,
        Phone_Number: phone_number,
        Monthly_Income: monthly_salary,
        Approved_Limit: approved_limit,
      };

      return res.status(200).json({
        message: `User ${first_name} ${last_name} updated successfully`,
        data: updatedCustomer,
      });
    } else {
      const [insertedCustomer] = await connection.execute(
        "INSERT INTO customer (first_name, last_name, age, phone_number, monthly_salary, approved_limit) VALUES (?, ?, ?, ?, ?, ?)",
        [
          first_name,
          last_name,
          age,
          phone_number,
          monthly_salary,
          approved_limit,
        ]
      );

      const newCustomer = {
        Customer_id: insertedCustomer.insertId,
        name: `${first_name} ${last_name}`,
        Age: age,
        Phone_Number: phone_number,
        Monthly_Income: monthly_salary,
        Approved_Limit: approved_limit,
      };

      return res.status(201).json({
        message: `User ${first_name} ${last_name} created successfully`,
        data: newCustomer,
      });
    }
  } catch (err) {
    console.error("User registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
};

async function getCustomerData(connection, customer_id) {
  const [customerRows] = await connection.execute(
    "SELECT * FROM customer WHERE customer_id = ?",
    [customer_id]
  );
  return customerRows[0];
}

async function getLoanData(connection, customer_id) {
  const [loanData] = await connection.execute(
    "SELECT * FROM loan WHERE customer_id = ?",
    [customer_id]
  );
  return loanData;
}

async function determineLoanApproval(creditScore, interest_rate) {
  let approval, correctedInterestRate;

  if (creditScore > 50) {
    approval = "Approved";
    if (interest_rate <= 11) {
      correctedInterestRate = interest_rate;
    } else {
      correctedInterestRate = 10;
    }
  } else if (creditScore > 30) {
    approval = "Approved";
    correctedInterestRate = 12;
  } else if (creditScore > 10) {
    approval = "Approved";
    correctedInterestRate = 16;
  } else {
    approval = "Rejected";
    correctedInterestRate = 0;
  }

  return { approval, correctedInterestRate };
}

async function calculateCreditScore(
  connection,
  loanRows,
  customer_id,
  loan_amount,
  approved_limit
) {
  try {
    let creditScore = 100;
    const currentDate = new Date();

    const loanData = await getLoanData(connection, customer_id);

    if (loanData) {
      for (const row of loanData) {
        const oldDate = new Date(row.start_date);

        const yearsDiff = currentDate.getFullYear() - oldDate.getFullYear();
        const monthsDiff = currentDate.getMonth() - oldDate.getMonth();
        const totalMonths = yearsDiff * 12 + monthsDiff;

        if (loanRows[0].EMIs_on_Time < totalMonths) {
          creditScore -= 20;
        }
      }
    } else {
      console.log("No loan data found for customer ID:", customer_id);
    }

    if (loanRows.length > 5) {
      creditScore -= 10;
    }

    if (loanData.length > 0) {
      for (const rows of loanData) {
        const enquiryDate = new Date(rows.start_date);
        if (enquiryDate.getFullYear() === currentDate.getFullYear()) {
          creditScore -= 3;
        }
      }
    } else {
      console.log("No old loan enquiry found for this year ID:", customer_id);
    }

    if (loan_amount > 1000000) {
      creditScore -= 5;
    }

    if (loan_amount > approved_limit) {
      creditScore = 0;
    }

    let totalPendingAmount = 0;
    for (const row of loanData) {
      const pendingEmi = row.monthly_payment;
      totalPendingAmount += pendingEmi;
    }
    if (totalPendingAmount > approved_limit * 0.5) {
      creditScore = 0;
    }
    return creditScore;
  } catch (error) {
    console.error("Error in calculateCreditScore:", error);
    throw error;
  }
}

const checkEligibility = async (req, res) => {
  const { customer_id, loan_amount, interest_rate, tenure } = req.body;

  try {
    const connection = await createConnection();
    const customer = await getCustomerData(connection, customer_id);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    const approved_limit =
      Math.round((36 * customer.monthly_salary) / 100000) * 100000;

    const loanRows = await getLoanData(connection, customer_id);

    if (loanRows.length > 0) {
      const creditScore = await calculateCreditScore(
        connection,
        loanRows,
        customer_id,
        loan_amount,
        approved_limit
      );
      const { approval, correctedInterestRate } = await determineLoanApproval(
        creditScore,
        interest_rate
      );
      const correctIntrestRate = parseInt(correctedInterestRate, 10);
      const approveLimit = parseInt(loan_amount, 10);

      const monthlyEmiForPay =
        parseInt((approveLimit * correctIntrestRate) / 100 + approveLimit) /
        tenure;

      return res.status(201).json({
        message: "Application submitted successfully",
        data: {
          customer_id,
          approval,
          interest_rate,
          corrected_interest_rate: correctedInterestRate,
          tenure,
          monthly_installment: monthlyEmiForPay,
        },
      });
    } else {
      const creditScore = await calculateCreditScore(
        connection,
        customer_id,
        loan_amount,
        approved_limit
      );
      const { approval, correctedInterestRate } = await determineLoanApproval(
        creditScore,
        interest_rate
      );
      const correctIntrestRate = parseInt(correctedInterestRate, 10);
      const approveLimit = parseInt(loan_amount, 10);

      const monthlyEmiForPay =
        parseInt((approveLimit * correctIntrestRate) / 100 + approveLimit) /
        tenure;

      return res.status(201).json({
        message: "Application submitted successfully",
        data: {
          customer_id,
          approval,
          interest_rate,
          corrected_interest_rate: correctedInterestRate,
          tenure,
          monthly_installment: monthlyEmiForPay,
        },
      });
    }
  } catch (err) {
    console.error("Application submission error:", err);
    return res.status(500).json({ error: "Application failed" });
  }
};
async function generateUniqueLoanId(connection) {
  let loan_id;
  while (true) {
    loan_id = Math.floor(1000 + Math.random() * 9000).toString();
    const [existingRows] = await connection.execute(
      "SELECT * FROM loan WHERE loan_id = ?",
      [loan_id]
    );

    if (existingRows.length === 0) {
      break;
    }
  }
  return loan_id;
}
async function insertIntoLoansTable(
  connection,
  customer_id,
  loan_id,
  loan_amount,
  interest_rate,
  tenure,
  monthly_payment,
  EMIs_on_Time
) {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();

  const endYear = year + Math.floor(month / tenure);
  const endMonth = (parseInt(month, 10) + parseInt(tenure, 10)) % 12;
  const end_date = `${endYear}-${endMonth.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;

  if (
    customer_id !== undefined &&
    loan_amount !== undefined &&
    interest_rate !== undefined &&
    tenure !== undefined &&
    monthly_payment !== undefined &&
    EMIs_on_Time !== undefined
  ) {
    const insertLoan =
      "INSERT INTO loan (customer_id,loan_id, loan_amount, tenure, interest_rate, monthly_payment, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?,?)";
    const insertLoanValue = [
      customer_id,
      loan_id,
      loan_amount,
      tenure,
      interest_rate,
      monthly_payment,
      currentDate,
      end_date,
    ];

    await connection.execute(insertLoan, insertLoanValue);
  } else {
    console.error("One or more parameters are undefined.");
  }
}
const createLoan = async (req, res) => {
  const { customer_id, loan_amount, interest_rate, tenure } = req.body;

  try {
    const connection = await createConnection();
    const customer = await getCustomerData(connection, customer_id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    const approved_limit =
      Math.round((36 * customer.monthly_salary) / 100000) * 100000;

    const loanRows = await getLoanData(connection, customer_id);

    if (loanRows.length > 0) {
      const creditScore = await calculateCreditScore(
        connection,
        loanRows,
        customer_id,
        loan_amount,
        approved_limit
      );
      const { approval, correctedInterestRate } = await determineLoanApproval(
        creditScore,
        interest_rate
      );
      const correctInterestRate = parseInt(correctedInterestRate, 10);
      const approveLimit = parseInt(loan_amount, 10);
      if (approval === "Approved") {
        const loan_id = await generateUniqueLoanId(connection);

        const monthlyEmiForPay =
          ((approveLimit * correctInterestRate) / 100 + approveLimit) / tenure;
        await insertIntoLoansTable(
          connection,
          customer_id,
          loan_id,
          loan_amount,
          correctInterestRate,
          tenure,
          monthlyEmiForPay,
          true
        );
        return res.status(201).json({
          message: "Loan approved and created successfully",
          data: {
            loan_id,
            customer_id,
            loan_approved: true,
            correctInterestRate,
            monthly_installment: monthlyEmiForPay,
          },
        });
      } else {
        return res.status(200).json({
          message: "Loan not approved",
          data: {
            loan_id: null,
            customer_id,
            loan_approved: false,
            message: "Loan not approved due to low credit score",
          },
        });
      }
    } else {
      const creditScore = await calculateCreditScore(
        connection,
        loanRows,
        customer_id,
        loan_amount,
        approved_limit
      );
      const { approval, correctedInterestRate } = await determineLoanApproval(
        creditScore,
        interest_rate
      );
      const correctInterestRate = parseInt(correctedInterestRate, 10);
      const approveLimit = parseInt(loan_amount, 10);
      if (approval === "Approved") {
        const loan_id = await generateUniqueLoanId(connection);

        const monthlyEmiForPay =
          ((approveLimit * correctInterestRate) / 100 + approveLimit) / tenure;
        await insertIntoLoansTable(
          connection,
          customer_id,
          loan_id,
          loan_amount,
          correctInterestRate,
          tenure,
          monthlyEmiForPay,
          true
        );
        return res.status(201).json({
          message: "Loan approved and created successfully",
          data: {
            loan_id,
            customer_id,
            loan_approved: true,
            correctInterestRate,
            monthly_installment: monthlyEmiForPay,
          },
        });
      } else {
        return res.status(200).json({
          message: "Loan not approved",
          data: {
            loan_id: null,
            customer_id,
            loan_approved: false,
            message: "Loan not approved due to low credit score",
          },
        });
      }
    }
  } catch (err) {
    console.error("Loan creation error:", err);
    return res.status(500).json({ error: "Loan creation failed" });
  }
};
async function findLoanById(connection, loanId) {
  try {
    const sql = "SELECT * FROM loan WHERE loan_id = ?";
    const [result] = await connection.query(sql, [loanId]);
    if (result.length === 0) {
      return null;
    }
    return result[0];
  } catch (err) {
    throw new Error(`Failed to fetch loan by ID: ${err}`);
  }
}

const viewLoan = async (req, res) => {
  try {
    const loanId = parseInt(req.params.loan_id);
    if (isNaN(loanId) || loanId <= 0) {
      return res.status(400).json({ error: "Invalid loan_id provided" });
    }
    const connection = await createConnection();
    const loan = await findLoanById(connection, loanId);
    if (loan === null) {
      return res.status(404).json({ error: "Loan not found" });
    }
    const customer_id = loan.customer_id;
    const customer = await getCustomerData(connection, customer_id);
    return res.status(200).json({
      message: "Successfully retrieved loan details!",
      data: {
        loan_id: loanId,
        customer,
        loan_amount: loan.loan_amount,
        interest_rate: loan.interest_rate,
        monthly_installment: loan.monthly_payment,
        tenure: loan.tenure,
      },
    });
  } catch (err) {
    console.error("Error in viewLoan:", err);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};
async function loanInfo(connection, customer_id, loan_id) {
  try {
    const sql = "SELECT * FROM loan WHERE loan_id = ? and customer_id=?";
    const [result] = await connection.query(sql, [loan_id, customer_id]);
    if (result.length === 0) {
      return null;
    }
    return result[0];
  } catch (err) {
    throw new Error(`Failed to fetch loan by ID: ${err}`);
  }
}
async function PaidEmiBalance(connection, customer_id, loan_id) {
  let pendingEMIAmount = 0;
  try {
    const sql = `select sum(amount_paid) as totalPaid from payments where  customer_id=${customer_id} AND loan_id=${loan_id}`;
    const [result] = await connection.query(sql);
    if (!result[0]) {
      return 0;
    } else {
      pendingEMIAmount = result[0].totalPaid;
      return pendingEMIAmount;
    }
  } catch (err) {
    throw new Error(
      `Failed to calculate pending EMI balance for the loan: ${err}`
    );
  }
}
const makePayment = async (req, res) => {
  const { customer_id, loan_id } = req.params;
  const { amountPaid } = req.body;

  try {
    const connection = await createConnection();
    const loanIn = await loanInfo(connection, customer_id, loan_id);

    if (!loanIn) {
      return res.status(404).json({ error: "Loan not found for the customer" });
    }

    const currentEMIAmount = loanIn.monthly_payment;

    let newEMIAmount;

    if (amountPaid >= currentEMIAmount) {
      newEMIAmount = 0;
    } else {
      newEMIAmount = currentEMIAmount - amountPaid;
    }

    const date = new Date();
    await connection.query(
      "INSERT INTO payments (customer_id, loan_id, amount_paid, paid_date) VALUES (?, ?, ?, ?)",
      [customer_id, loan_id, amountPaid, date]
    );
    const PaidEmi = await PaidEmiBalance(connection, customer_id, loan_id);
    if (PaidEmi) {
      const EmiOnTime = Math.floor(PaidEmi / currentEMIAmount);
      if (EmiOnTime) {
        await connection.query(
          "UPDATE loan SET EMIs_on_Time = ? WHERE loan_id = ? AND customer_id = ?",
          [EmiOnTime, loan_id, customer_id]
        );
      }
    }
    res.json({
      message: "Payment successful",
      "Pending EMI Balance": newEMIAmount,
    });
  } catch (error) {
    console.error("Error in making payment:", error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

const viewStatement = async (req, res) => {
  const { customer_id, loan_id } = req.params;

  try {
    const connection = await createConnection();
    const [loanDetails] = await connection.query(
      "SELECT * FROM loan WHERE loan_id = ? AND customer_id = ?",
      [loan_id, customer_id]
    );

    if (loanDetails.length === 0) {
      return res.status(404).json({ error: "Loan not found for the customer" });
    }
    const [paymentHistory] = await connection.query(
      "SELECT * FROM payments WHERE loan_id = ?",
      [loan_id]
    );
    const statement = {
      loanDetails: loanDetails[0],
      paymentHistory: paymentHistory,
    };

    res.json(statement);
  } catch (error) {
    console.error("Error in viewing statement:", error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

export {
  register,
  checkEligibility,
  createLoan,
  viewLoan,
  makePayment,
  viewStatement,
};
