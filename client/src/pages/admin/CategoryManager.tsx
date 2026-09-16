import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api";
import { useConfig } from "../../hooks/useConfig";
import { APP_ICONS, detectAppIconKey } from "../../iconCatalog";
import type { AppEntry, Category } from "../../types";

interface AppFormState {
  name: string;
  domain: string;
  localIp: string;
  iconUrl: string;
  iconKey: string;
}

function resolveAutoIconKey(name: string, domain: string, localIp: string): string {
  return detectAppIconKey(name, domain, localIp) ?? "";
}

type AddressProtocol = "https://" | "http://";

function addressParts(value: string, fallback: AddressProtocol) {
  const match = value.trim().match(/^(https?:\/\/)(.*)$/i);
  return {
    protocol: match ? match[1].toLowerCase() as AddressProtocol : fallback,
    address: match ? match[2] : value.trim(),
  };
}

function completeAddress(value: string, fallback: AddressProtocol) {
  const { protocol, address } = addressParts(value, fallback);
  return address ? protocol + address : "";
}

function AddressField({ label, value, defaultProtocol, placeholder, onChange }: {
  label: string;
  value: string;
  defaultProtocol: AddressProtocol;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const { t } = useTranslation();
  const [selectedProtocol, setSelectedProtocol] = useState(defaultProtocol);
  const { protocol, address } = addressParts(value, selectedProtocol);
  return (
    <div className="admin-form-field">
      <label className="admin-form-label" htmlFor={id}>{label}</label>
      <div className="admin-address-input">
        <select
          aria-label={label + " " + t("admin.addressProtocol")}
          value={protocol}
          onChange={(event) => {
            const next = event.target.value as AddressProtocol;
            setSelectedProtocol(next);
            onChange(address ? next + address : "");
          }}
        >
          <option value="https://">https://</option>
          <option value="http://">http://</option>
        </select>
        <input
          id={id}
          placeholder={placeholder}
          value={address}
          onChange={(event) => {
            const next = addressParts(event.target.value, protocol);
            setSelectedProtocol(next.protocol);
            onChange(next.address ? next.protocol + next.address : "");
          }}
        />
      </div>
    </div>
  );
}

function AppFormFields({
  form,
  onChange,
}: {
  form: AppFormState;
  onChange: (next: AppFormState) => void;
}) {
  const { t } = useTranslation();
  const [iconSearch, setIconSearch] = useState("");
  const detectedIconKey = detectAppIconKey(form.name, form.domain, form.localIp);
  const selectedIconKey = form.iconKey || detectedIconKey || "";
  const normalizedSearch = iconSearch.trim().toLowerCase();
  const filteredIcons = APP_ICONS.filter((icon) =>
    [icon.label, icon.id, ...icon.aliases].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    ),
  ).sort((left, right) => left.label.localeCompare(right.label, "de"));

  return (
    <div className="admin-form-fields">
      <label className="admin-form-field">
        <span className="admin-form-label">{t("admin.appName")}</span>
        <input
          value={form.name}
          onChange={(e) =>
            onChange({
              ...form,
              name: e.target.value,
            })
          }
        />
      </label>
      <AddressField
        label={t("admin.domain")}
        value={form.domain}
        defaultProtocol="https://"
        placeholder="app.example.com"
        onChange={(domain) => onChange({ ...form, domain })}
      />
      <AddressField
        label={t("admin.localIp")}
        value={form.localIp}
        defaultProtocol="http://"
        placeholder="192.168.1.10:8080"
        onChange={(localIp) => onChange({ ...form, localIp })}
      />
      <div className="admin-form-field">
        <span className="admin-form-label">Icon auswählen</span>
        <input
          type="search"
          placeholder="Icon suchen …"
          value={iconSearch}
          onChange={(e) => setIconSearch(e.target.value)}
        />
        <div className="admin-icon-picker" role="listbox" aria-label="Icon auswählen">
          <button
            type="button"
            className={`admin-icon-option ${selectedIconKey === "" ? "selected" : ""}`}
            onClick={() => onChange({ ...form, iconKey: "" })}
          >
            <span className="admin-icon-option-preview">{detectedIconKey ? "AUTO" : "--"}</span>
            <span>
              <strong>{detectedIconKey ? "Automatisch erkannt" : "Kein Katalog-Icon"}</strong>
              {detectedIconKey && <small>{detectedIconKey}</small>}
            </span>
          </button>
          {filteredIcons.map((icon) => (
            <button
              type="button"
              role="option"
              aria-selected={selectedIconKey === icon.id}
              className={`admin-icon-option ${selectedIconKey === icon.id ? "selected" : ""}`}
              key={icon.id}
              onClick={() => onChange({ ...form, iconKey: icon.id })}
            >
              <img className="admin-icon-option-preview" src={icon.path} alt="" />
              <span>
                <strong>{icon.label}</strong>
                <small>{icon.id}</small>
              </span>
            </button>
          ))}
          {filteredIcons.length === 0 && (
            <span className="admin-icon-picker-empty">Keine Icons gefunden.</span>
          )}
        </div>
      </div>
      <label className="admin-form-field">
        <span className="admin-form-label">{t("admin.iconUrl")}</span>
        <input
          value={form.iconUrl}
          onChange={(e) => onChange({ ...form, iconUrl: e.target.value })}
        />
      </label>
      <label className="admin-form-field">
        <span className="admin-form-label">Eigenes Icon hochladen</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") {
                onChange({ ...form, iconUrl: reader.result, iconKey: "" });
              }
            };
            reader.readAsDataURL(file);
          }}
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
    iconKey: app.iconKey ?? detectAppIconKey(app.name, app.domain ?? "", app.localIp ?? "") ?? "",
  });

  const save = async () => {
    const normalized = {
      ...form,
      domain: completeAddress(form.domain, "https://"),
      localIp: completeAddress(form.localIp, "http://"),
      iconKey: form.iconKey || resolveAutoIconKey(form.name, form.domain, form.localIp),
    };
    await api.updateApp(category.id, app.id, normalized);
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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AppFormState>({
    name: "",
    domain: "",
    localIp: "",
    iconUrl: "",
    iconKey: "",
  });

  const add = async () => {
    if (saving) return;
    setError("");
    if (!form.name.trim()) {
      setError(t("admin.appNameRequired"));
      return;
    }
    setSaving(true);
    try {
      await api.createApp(category.id, {
        ...form,
        name: form.name.trim(),
        domain: completeAddress(form.domain, "https://"),
        localIp: completeAddress(form.localIp, "http://"),
        iconUrl: form.iconUrl.trim(),
        iconKey: form.iconKey || resolveAutoIconKey(form.name, form.domain, form.localIp),
      });
      setForm({ name: "", domain: "", localIp: "", iconUrl: "", iconKey: "" });
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("admin.appCreateFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-new-app-form">
      <AppFormFields form={form} onChange={setForm} />
      <p role="alert" className="admin-login-error" hidden={!error}>{error}</p>
      <button type="button" onClick={add} disabled={saving}>
        {t(saving ? "admin.appSaving" : "admin.addApp")}
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
    await api.updateOrders({ appOrders: [{ categoryId: category.id, appIds: ordered.map((app) => app.id) }] });
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
  const activeId = selectedId ?? categories[0]?.id ?? null;
  const selectedCategory = categories.find((c) => c.id === activeId) ?? null;

  if (!config) return null;

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const created = await api.createCategory({ name: newCategoryName });
    await refresh();
    setNewCategoryName("");
    setSelectedId(created.id);
  };

  const persistCategoryOrder = async (ordered: Category[]) => {
    await api.updateOrders({ categoryIds: ordered.map((category) => category.id) });
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
                className={category.id === activeId ? "active" : ""}
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
              key={selectedCategory.id}
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
