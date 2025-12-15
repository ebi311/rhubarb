export type FilterStatus = "all" | "active" | "suspended";

export interface ClientFilterTabsProps {
  activeFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
}

export const ClientFilterTabs = ({
  activeFilter,
  onFilterChange,
}: ClientFilterTabsProps) => {
  return (
    <div role="tablist" className="tabs tabs-box">
      <button
        role="tab"
        className={`tab ${activeFilter === "all" ? "tab-active" : ""}`}
        onClick={() => onFilterChange("all")}
      >
        全て
      </button>
      <button
        role="tab"
        className={`tab ${activeFilter === "active" ? "tab-active" : ""}`}
        onClick={() => onFilterChange("active")}
      >
        契約中
      </button>
      <button
        role="tab"
        className={`tab ${activeFilter === "suspended" ? "tab-active" : ""}`}
        onClick={() => onFilterChange("suspended")}
      >
        中断中
      </button>
    </div>
  );
};
