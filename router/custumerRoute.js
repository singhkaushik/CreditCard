import express from "express";
import {
  register,
  checkEligibility,
  createLoan,
  viewLoan,
  makePayment,
  viewStatement,
} from "../controller/customerController.js";
const customerRoute = express.Router();

customerRoute.post("/register", register);
customerRoute.post("/check-eligibility", checkEligibility);
customerRoute.post("/create-loan", createLoan);
customerRoute.get("/view-loan/:loan_id", viewLoan);
customerRoute.get("/make-payment/:customer_id/:loan_id", makePayment);
customerRoute.get("/view-statement/:customer_id/:loan_id", viewStatement);

export default customerRoute;
