import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import { useConfig } from "../../context/ConfigContext";
import type { AppEntry, Category } from "../../types";

interface AppFormState {
  name: string;
  domain: string;
  localIp: string;
  iconUrl: string;
}

function AppFormFields({
  form,
  onChange,
}: {
  form: AppFormState;
  onChange: (next: AppFormState) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="admin-form-fields">
      <label className="admin-form-field">
        <span className="admin-form-label">{t("admin.appName")}</span>
        <input
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </label>
      <label className="admin-form-field">
        <span className="admin-form-label">{t("admin.domain")}</span>
        <input
          placeholder="https://..."
          value={form.domain}
          onChange={(e) => onChange({ ...form, domain: e.target.value })}
        />
      </label>
      <label className="admin-form-field">
        <span className="admin-form-label">{t("admin.localIp")}</span>
        <input
          placeholder="http://192.168.x.x"
          value={form.localIp}
          onChange={(e) => onChange({ ...form, localIp: e.target.value })}
        />
      </label>
      <label className="admin-form-field">
        <span className="admin-form-label">{t("admin.iconUrl")}</span>
        <input
          value={form.iconUrl}
          onChange={(e) => onChange({ ...form, iconUrl: e.target.value })}
        />
      </label>
    </div>
  );
}

function AppRow({
  category,
  app,
  otherCategories,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  category: Category;
  app: AppEntry;
  otherCategories: Category[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
}) {
  const { refresh } = useConfig();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AppFormState>({
    name: app.name,
    domain: app.domain ?? "",
    localIp: app.localIp ?? "",
    iconUrl: app.iconUrl ?? "",
  });

  const save = async () => {
    await api.updateApp(category.id, app.id, form);
    await refresh();
    setEditing(false);
  };

  const remove = async () => {
    await api.deleteApp(category.id, app.id);
    await refresh();
  };

  const move = async (targetCategoryId: string) => {
    if (!targetCategoryId) return;
    await api.moveApp(category.id, app.id, targetCategoryId);
    await refresh();
  };

  if (!editing) {
    return (
      <div className="admin-app-row">
        <div className="admin-app-row-info">
          <span className="admin-app-row-name">{app.name}</span>
          {(app.domain || app.localIp) && (
            <span className="admin-app-row-meta">{app.domain || app.localIp}</span>
          )}
        </div>
        <div className="admin-app-row-actions">
          <div className="admin-app-reorder">
            <button type="button" disabled={!canMoveUp} title={t("admin.moveUp")} onClick={onMoveUp}>
              ▲
            </button>
            <button
              type="button"
              disabled={!canMoveDown}
              title={t("admin.moveDown")}
              onClick={onMoveDown}
            >
              ▼
            </button>
          </div>
          {otherCategories.length > 0 && (
            <select value="" onChange={(e) => move(e.target.value)} title={t("admin.moveTo")}>
              <option value="" disabled>
                {t("admin.moveTo")}
              </option>
              {otherCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={() => setEditing(true)}>
            ✎
          </button>
          <button type="button" className="btn btn-danger" onClick={remove}>
            {t("admin.delete")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-app-row admin-app-row-edit">
      <AppFormFields form={form} onChange={setForm} />
      <div className="admin-app-row-actions">
        <button type="button" onClick={save}>
          {t("admin.save")}
        </button>
        <button type="button" onClick={() => setEditing(false)}>
          {t("admin.cancel")}
        </button>
      </div>
    </div>
  );
}

function NewAppForm({ category }: { category: Category }) {
  const { refresh } = useConfig();
  const { t } = useTranslation();
  const [form, setForm] = useState<AppFormState>({
    name: "",
    domain: "",
    localIp: "",
    iconUrl: "",
  });

  const add = async () => {
    if (!form.name.trim()) return;
    await api.createApp(category.id, form);
    await refresh();
    setForm({ name: "", domain: "", localIp: "", iconUrl: "" });
  };

  return (
    <div className="admin-new-app-form">
      <AppFormFields form={form} onChange={setForm} />
      <button type="button" onClick={add}>
        {t("admin.addApp")}
      </button>
    </div>
  );
}

function CategoryDetail({
  category,
  allCategories,
  onDeleted,
}: {
  category: Category;
  allCategories: Category[];
  onDeleted: () => void;
}) {
  const { refresh } = useConfig();
  const { t } = useTranslation();
  const otherCategories = allCategories.filter((c) => c.id !== category.id);

  const removeCategory = async () => {
    if (category.apps.length > 0) {
      const confirmed = window.confirm(
        t("admin.confirmDeleteCategory", { name: category.name })
      );
      if (!confirmed) return;
    }
    await api.deleteCategory(category.id);
    await refresh();
    onDeleted();
  };

  const toggleDefaultCollapsed = async () => {
    await api.updateCategory(category.id, { collapsed: !category.collapsed });
    await refresh();
  };

  const orderedApps = [...category.apps].sort((a, b) => a.order - b.order);

  const persistAppOrder = async (ordered: AppEntry[]) => {
    for (let i = 0; i < ordered.length; i += 1) {
      const app = ordered[i];
      if (app.order !== i) {
        await api.updateApp(category.id, app.id, { order: i });
      }
    }
  };

  const moveApp = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedApps.length) return;
    const reordered = [...orderedApps];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    await persistAppOrder(reordered);
    await refresh();
  };

  return (
    <div className="admin-category-detail">
      <div className="admin-category-block-header">
        <h3>{category.name}</h3>
        <button type="button" className="btn btn-danger" onClick={removeCategory}>
          {t("admin.delete")}
        </button>
      </div>
      <label className="admin-checkbox-field">
        <input type="checkbox" checked={category.collapsed} onChange={toggleDefaultCollapsed} />
        {t("admin.defaultCollapsed")}
      </label>
      {orderedApps.map((app, index) => (
          <AppRow
            key={app.id}
            category={category}
            app={app}
            otherCategories={otherCategories}
            canMoveUp={index > 0}
            canMoveDown={index < orderedApps.length - 1}
            onMoveUp={() => moveApp(index, -1)}
            onMoveDown={() => moveApp(index, 1)}
          />
        ))}
      <NewAppForm category={category} />
    </div>
  );
}

export function CategoryManager() {
  const { config, refresh } = useConfig();
  const { t } = useTranslation();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categories = config ? [...config.categories].sort((a, b) => a.order - b.order) : [];
  const selectedCategory = categories.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && categories.length > 0) {
      setSelectedId(categories[0].id);
    }
  }, [categories, selectedId]);

  if (!config) return null;

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const created = await api.createCategory({ name: newCategoryName });
    await refresh();
    setNewCategoryName("");
    setSelectedId(created.id);
  };

  const persistCategoryOrder = async (ordered: Category[]) => {
    for (let i = 0; i < ordered.length; i += 1) {
      const category = ordered[i];
      if (category.order !== i) {
        await api.updateCategory(category.id, { order: i });
      }
    }
  };

  const moveCategory = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    await persistCategoryOrder(reordered);
    await refresh();
  };

  return (
    <div className="admin-section admin-category-manager">
      <h2>{t("admin.categories")}</h2>
      <div className="admin-category-manager-layout">
        <div className="admin-category-list">
          {categories.map((category, index) => (
            <div key={category.id} className="admin-category-list-item">
              <button
                type="button"
                className={category.id === selectedId ? "active" : ""}
                onClick={() => setSelectedId(category.id)}
              >
                {category.name}
              </button>
              <div className="admin-category-reorder">
                <button
                  type="button"
                  disabled={index === 0}
                  title={t("admin.moveUp")}
                  onClick={() => moveCategory(index, -1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={index === categories.length - 1}
                  title={t("admin.moveDown")}
                  onClick={() => moveCategory(index, 1)}
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
          <div className="admin-new-category">
            <input
              placeholder={t("admin.categoryName")}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <button type="button" onClick={addCategory}>
              {t("admin.addCategory")}
            </button>
          </div>
        </div>
        <div className="admin-category-detail-panel">
          {selectedCategory ? (
            <CategoryDetail
              category={selectedCategory}
              allCategories={categories}
              onDeleted={() => setSelectedId(null)}
            />
          ) : (
            <p className="admin-app-row-meta">{t("admin.selectCategory")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
