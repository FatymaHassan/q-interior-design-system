import { useEffect, useState } from "react";
import {
  getAttendances,
  getDepartments,
  getEmployeeGoals,
  getEmployees,
  getHolidays,
  getHrOverview,
  getLeaveBalances,
  getLeaveRequests,
  getPayrolls,
  getPerformanceReviews,
  getSalaryHistories,
} from "../../services/api";

export default function useHrData(loaders = ["overview", "employees", "departments"]) {
  const [data, setData] = useState({
    overview: null,
    employees: [],
    departments: [],
    attendances: [],
    leaveRequests: [],
    leaveBalances: [],
    holidays: [],
    payrolls: [],
    salaryHistories: [],
    reviews: [],
    goals: [],
  });
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState("");

  const load = () => {
    setStatus("loading");
    const jobs = {
      overview: () => getHrOverview(),
      employees: () => getEmployees(),
      departments: () => getDepartments(),
      attendances: () => getAttendances(),
      leaveRequests: () => getLeaveRequests(),
      leaveBalances: () => getLeaveBalances(),
      holidays: () => getHolidays(),
      payrolls: () => getPayrolls(),
      salaryHistories: () => getSalaryHistories(),
      reviews: () => getPerformanceReviews(),
      goals: () => getEmployeeGoals(),
    };

    return Promise.all(loaders.map((key) => jobs[key]().then((value) => [key, value])))
      .then((entries) => {
        setData((current) => ({ ...current, ...Object.fromEntries(entries) }));
        setStatus("connected");
        setNotice("");
      })
      .catch((error) => {
        setStatus("error");
        setNotice(error.response?.status === 403 ? "Your role cannot access part of HR yet." : "Backend is not reachable.");
      });
  };

  useEffect(() => {
    load();
  }, []);

  return { ...data, status, notice, reload: load };
}
