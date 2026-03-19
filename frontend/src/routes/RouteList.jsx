import Chats from "../views/Chat/Chats";
import ChatContacts from "../views/Chat/Contact";
import ChatGroups from "../views/Chat/Groups";
import ContactCards from "../views/Contact/ContactCards";
import ContactList from "../views/Contact/ContactList";
import EditContact from "../views/Contact/EditContact";
import Dashboard from "../views/Dashboard";
import GridView from "../views/FileManager/GridView";
import ListView from "../views/FileManager/ListView";
// ...existing code...
import TaskList from "../views/Todo/Tasklist";
import AdminHome from "../views/Admin/Home";
import AdminUsers from "../views/Admin/Users";
import AdminLogin from "../views/Admin/Login";

// Pages
// ...existing code...

// Auth
import Login from "../views/Authentication/LogIn/Login/Login";
import LoginSimple from "../views/Authentication/LogIn/LoginSimple";
import LoginClassic from "../views/Authentication/LogIn/LoginClassic";
import LockScreen from "../views/Authentication/LockScreen";
import ResetPassword from "../views/Authentication/ResetPassword";
import Error404 from "../views/Authentication/Error404/Error404";
import Error503 from "../views/Authentication/Error503/Error503";

import ChatPopup from "../views/ChatPopup/DirectMessage";
import ChatBot from "../views/ChatPopup/ChatBot";

/* ===============================
   MAIN ROUTES (FIXED)
================================ */
export const routes = [

  // Dashboard
  { path: "/dashboard", component: Dashboard },

  // Apps
  { path: "/apps/chat/chats", component: Chats },
  { path: "/apps/chat/chat-groups", component: ChatGroups },
  { path: "/apps/chat/chat-contact", component: ChatContacts },
  { path: "/apps/chat-bot/chatpopup", component: ChatPopup },
  { path: "/apps/chat-bot/chatbot", component: ChatBot },
  { path: "/apps/contacts/contact-list", component: ContactList },
  { path: "/apps/contacts/contact-cards", component: ContactCards },
  { path: "/apps/contacts/edit-contact", component: EditContact },
  { path: "/apps/file-manager", component: GridView },
  { path: "/apps/file-manager/list-view", component: ListView },
  { path: "/apps/file-manager/grid-view", component: GridView },
  // ...existing code...
  { path: "/apps/todo/task-list", component: TaskList },

  // Admin
  { path: "/admin/dashboard", component: AdminHome },
  { path: "/admin/login", component: AdminLogin },
  { path: "/admin/users", component: AdminUsers },

  // Pages
  // ...existing code...

  // Error
  { path: "/error-404", component: Error404 },
];

/* ===============================
   AUTH ROUTES (FIXED)
================================ */
export const authRoutes = [
  { path: "/login", component: Login },
  { path: "/login-simple", component: LoginSimple },
  { path: "/login-classic", component: LoginClassic },
  { path: "/lock-screen", component: LockScreen },
  { path: "/reset-password", component: ResetPassword },
  { path: "/error-503", component: Error503 },
];
