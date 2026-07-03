import { createContext, useContext, useState, useEffect } from "react";
import { accountApi } from "../api/accountApi";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const DEFAULT_EXPENSE_CATEGORIES = [
  { accountId: "", name: "Ăn uống", iconName: "Pizza", color: "red" },
];

const DEFAULT_INCOME_SOURCES = [
  {
    accountId: "",
    name: "Lương",
    iconName: "BriefcaseBusiness",
    color: "green",
  },
];

const DEFAULT_TAGS = [
  { id: "1", name: "DuLich", color: "blue" },
  { id: "2", name: "KinhDoanh", color: "emerald" },
  { id: "3", name: "GiaDinh", color: "orange" },
  { id: "4", name: "GiaoDuc", color: "purple" },
  { id: "5", name: "KhuyenMai", color: "pink" },
];

const DEFAULT_OBJECT_GROUPS = [
  { id: "1", name: "Công ty ABC", type: "company", role: "payer", notes: "" },
  { id: "2", name: "Nguyễn Văn A", type: "person", role: "payee", notes: "" },
  { id: "3", name: "Shopee", type: "company", role: "payee", notes: "" },
];

function load(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}
const CategoriesContext = createContext(null);

export function CategoriesProvider({ children }) {
  const [expenseCategories, setExpenseCategories] = useState(() =>
    load("expense_categories", []),
  );
  const [incomeSources, setIncomeSources] = useState(() =>
    load("income_sources", []),
  );
  const fetchCategories = async () => {
    try {
      const [expenseRes, incomeRes] = await Promise.all([
        accountApi.getByType(5),
        accountApi.getByType(4),
      ]);
      const allExpenseCategories = [...(expenseRes.items ?? [])];

      const allIncomeCategories = [...(incomeRes.items ?? [])];
      setExpenseCategories(
        allExpenseCategories.length > 0
          ? allExpenseCategories
          : DEFAULT_EXPENSE_CATEGORIES,
      );
      setIncomeSources(
        allIncomeCategories.length > 0
          ? allIncomeCategories
          : DEFAULT_INCOME_SOURCES,
      );
    } catch (err) {
      setExpenseCategories(
        load("expense_categories", DEFAULT_EXPENSE_CATEGORIES),
      );
      setIncomeSources(load("income_sources", DEFAULT_INCOME_SOURCES));
    }
  };
  const { user, loading } = useAuth();

  useEffect(() => {
    //if (loading) return;
    //if (user) return;
    //T: Who added those things? what's the point?
    fetchCategories();
  }, [user, loading]);

  const [tags, setTags] = useState(() => load("app_tags", DEFAULT_TAGS));
  const [objectGroups, setObjectGroups] = useState(() =>
    load("app_object_groups", DEFAULT_OBJECT_GROUPS),
  );

  useEffect(() => {
    localStorage.setItem(
      "expense_categories",
      JSON.stringify(expenseCategories),
    );
  }, [expenseCategories]);
  useEffect(() => {
    localStorage.setItem("income_sources", JSON.stringify(incomeSources));
  }, [incomeSources]);
  useEffect(() => {
    localStorage.setItem("app_tags", JSON.stringify(tags));
  }, [tags]);
  useEffect(() => {
    localStorage.setItem("app_object_groups", JSON.stringify(objectGroups));
  }, [objectGroups]);

  // These re-throw on failure so callers can await and react (toast/keep form
  // open) instead of silently assuming success.
  const addExpenseCategory = async (cat) => {
    try {
      const result = await accountApi.create({
        ...cat,
        typeId: 5,
      });
      setExpenseCategories((prev) => [...prev, result]);
      return result;
    } catch (err) {
      console.error("Lỗi khi tạo danh mục", err);
      throw err;
    }
  };
  const updateExpenseCategory = async (id, upd) => {
    try {
      const result = await accountApi.update(id, upd);
      setExpenseCategories((prev) =>
        prev.map((c) => (c.accountId === id ? { ...c, ...result } : c)),
      );
      return result;
    } catch (err) {
      console.error("Lỗi khi sửa danh mục", err);
      throw err;
    }
  };
  const deleteExpenseCategory = async (id) => {
    try {
      await accountApi.delete(id);

      setExpenseCategories((prev) =>
        prev.filter((item) => item.accountId !== id),
      );
    } catch (err) {
      console.error("Lỗi khi xoá danh mục", err);
      throw err;
    }
  };

  const addIncomeSource = async (src) => {
    try {
      const result = await accountApi.create({
        ...src,
        typeId: 4,
      });
      setIncomeSources((prev) => [...prev, result]);
      return result;
    } catch (err) {
      console.error("Lỗi khi tạo nguồn thu", err);
      throw err;
    }
  };
  const updateIncomeSource = async (id, upd) => {
    try {
      const result = await accountApi.update(id, upd);
      setIncomeSources((prev) =>
        prev.map((s) => (s.accountId === id ? { ...s, ...result } : s)),
      );
      return result;
    } catch (err) {
      console.error("Lỗi khi sửa nguồn thu: ", err);
      throw err;
    }
  };
  const deleteIncomeSource = async (id) => {
    try {
      await accountApi.delete(id);

      setIncomeSources((prev) => prev.filter((item) => item.accountId !== id));
      toast.success("Xoá danh mục thành công");
    } catch (err) {
      console.error("Lỗi khi xoá nguồn thu", err);
      throw err;
    }
  };

  const addTag = (tag) =>
    setTags((prev) => [...prev, { ...tag, id: Date.now().toString() }]);
  const updateTag = (id, upd) =>
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...upd } : t)));
  const deleteTag = (id) => setTags((prev) => prev.filter((t) => t.id !== id));

  const addObjectGroup = (obj) =>
    setObjectGroups((prev) => [...prev, { ...obj, id: Date.now().toString() }]);
  const updateObjectGroup = (id, upd) =>
    setObjectGroups((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...upd } : o)),
    );
  const deleteObjectGroup = (id) =>
    setObjectGroups((prev) => prev.filter((o) => o.id !== id));

  return (
    <CategoriesContext.Provider
      value={{
        fetchCategories,
        expenseCategories,
        addExpenseCategory,
        updateExpenseCategory,
        deleteExpenseCategory,
        incomeSources,
        addIncomeSource,
        updateIncomeSource,
        deleteIncomeSource,
        tags,
        addTag,
        updateTag,
        deleteTag,
        objectGroups,
        addObjectGroup,
        updateObjectGroup,
        deleteObjectGroup,
      }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export const useCategories = () => {
  const ctx = useContext(CategoriesContext);
  if (!ctx)
    throw new Error("useCategories must be used within CategoriesProvider");
  return ctx;
};
