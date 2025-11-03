import { apiFetch } from "./client";
import { User } from "../types";
export async function getUsers(): Promise<User[]> { return apiFetch<User[]>("/users"); }
