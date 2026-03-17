import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:3001/api";

export const api = axios.create({
  baseURL: API_BASE,
});

export const fetchOrders = async () => {
  const { data } = await api.get("/orders");
  return data;
};

export const createOrder = async (payload) => {
  const { data } = await api.post("/orders", payload);
  return data;
};

export const updateOrderStatus = async (id, status) => {
  const { data } = await api.patch(`/orders/${id}/status`, { status });
  return data;
};

export const fetchCustomers = async () => {
  const { data } = await api.get("/customers");
  return data;
};

export const searchCustomers = async (name) => {
  const { data } = await api.get(`/customers/search?name=${name}`);
  return data;
};

export const fetchProducts = async () => {
  const { data } = await api.get("/products");
  return data;
};