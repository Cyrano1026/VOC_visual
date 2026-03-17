import rawData from "../../exported_data.json";
import { useState, type CSSProperties } from "react";
import dayjs from "dayjs";
import {
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  chatId: string;
  chatText: string;
  label: string;
  latestUserDate?: string;
  firstUserDate?: string;
};

type ChartDatum = Record<string, number | string>;

const ALL_MONTHS = "전체";

const getDateStr = (row: Row) => row.latestUserDate ?? row.firstUserDate ?? "";

const validRawData = (rawData as Row[]).filter((row) => dayjs(getDateStr(row)).isValid());

const extractAllLabels = (data: Row[]) => {
  const set = new Set<string>();

  data.forEach((row) => {
    if (typeof row.label !== "string") {
      return;
    }

    row.label
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean)
      .forEach((label) => set.add(label));
  });

  return Array.from(set).sort();
};

const extractAvailableYears = (data: Row[]) =>
  Array.from(
    new Set(
      data
        .map((row) => dayjs(getDateStr(row)))
        .filter((date) => date.isValid())
        .map((date) => String(date.year())),
    ),
  ).sort((a, b) => Number(a) - Number(b));

function groupByMonthAndLabel(data: Row[], allLabels: string[]) {
  const stats: Record<string, Record<string, number>> = {};

  data.forEach((row) => {
    const date = dayjs(getDateStr(row));
    if (!date.isValid()) {
      return;
    }

    const month = date.format("YYYY-MM");
    if (!stats[month]) {
      stats[month] = {};
    }

    const labels = row.label?.split(",").map((label) => label.trim()).filter(Boolean) ?? [];
    labels.forEach((label) => {
      if (!stats[month][label]) {
        stats[month][label] = 0;
      }
      stats[month][label] += 1;
    });
  });

  return Object.entries(stats)
    .map(([month, labelMap]) => {
      const filled: ChartDatum = { month };

      allLabels.forEach((label) => {
        filled[label] = labelMap[label] || 0;
      });

      return filled;
    })
    .sort((a, b) => dayjs(String(a.month)).unix() - dayjs(String(b.month)).unix());
}

function groupByDayAndLabelWithFill(data: Row[], targetMonth: string, allLabels: string[]) {
  const stats: Record<string, Record<string, number>> = {};

  data
    .filter((row) => dayjs(getDateStr(row)).format("YYYY-MM") === targetMonth)
    .forEach((row) => {
      const day = dayjs(getDateStr(row)).format("YYYY-MM-DD");
      const labels = row.label?.split(",").map((label) => label.trim()).filter(Boolean) ?? [];

      if (!stats[day]) {
        stats[day] = {};
      }

      labels.forEach((label) => {
        if (!stats[day][label]) {
          stats[day][label] = 0;
        }
        stats[day][label] += 1;
      });
    });

  const start = dayjs(`${targetMonth}-01`);
  const end = start.endOf("month");
  const allDays: string[] = [];

  for (let date = start; date.isSame(end) || date.isBefore(end); date = date.add(1, "day")) {
    allDays.push(date.format("YYYY-MM-DD"));
  }

  return allDays.map((day) => {
    const labelCounts = stats[day] || {};
    const dayData: ChartDatum = { day };

    allLabels.forEach((label) => {
      dayData[label] = labelCounts[label] || 0;
    });

    return dayData;
  });
}

const CustomTick = ({ x, y, payload }: any) => {
  const date = dayjs(payload.value);
  const dayOfWeek = date.day();
  const color = dayOfWeek === 0 ? "red" : dayOfWeek === 6 ? "blue" : "#666";

  return (
    <text x={x} y={y + 10} textAnchor="middle" fontSize={12} fill={color}>
      {date.format("DD")}
    </text>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #ccc", padding: 6 }}>
      <div>
        <strong>{label}</strong>
      </div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ color: entry.color }}>
          {entry.dataKey}: {entry.value}
        </div>
      ))}
    </div>
  );
};

const buttonStyle = (active: boolean): CSSProperties => ({
  margin: 4,
  padding: "6px 12px",
  backgroundColor: active ? "#007bff" : "#ddd",
  color: active ? "#fff" : "#000",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
});

const checkboxStyle = (active: boolean): CSSProperties => ({
  userSelect: "none",
  padding: "4px 8px",
  borderRadius: 4,
  border: active ? "2px solid #007bff" : "2px solid #ccc",
  backgroundColor: active ? "#cce5ff" : "#f8f9fa",
  cursor: "pointer",
});

const formatYearLabel = (year: string) => `${year}년`;
const formatMonthLabel = (month: string) => `${dayjs(`${month}-01`).month() + 1}월`;

export default function ChartLine() {
  const allLabels = extractAllLabels(validRawData);
  const availableYears = extractAvailableYears(validRawData);

  const [selectedLabels, setSelectedLabels] = useState<string[]>(allLabels);
  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] ?? "");
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_MONTHS);
  const [clickedDate, setClickedDate] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<"date" | "label">("date");

  const isAllSelected = selectedLabels.length === allLabels.length;

  const yearData = validRawData.filter((row) => dayjs(getDateStr(row)).format("YYYY") === selectedYear);
  const monthlyData = groupByMonthAndLabel(yearData, allLabels);
  const months = monthlyData.map((datum) => String(datum.month));
  const dailyData =
    selectedMonth === ALL_MONTHS ? [] : groupByDayAndLabelWithFill(yearData, selectedMonth, allLabels);

  const labelsToShow = selectedLabels;

  const filteredRaw = yearData.filter((row) => {
    const dateMatch = clickedDate
      ? dayjs(getDateStr(row)).format("YYYY-MM-DD") === clickedDate
      : false;
    const labelMatch =
      selectedLabels.length === 0 || selectedLabels.some((label) => row.label?.includes(label));

    return dateMatch && labelMatch;
  });

  const sortedRaw = [...filteredRaw].sort((a, b) => {
    if (sortOption === "date") {
      return dayjs(getDateStr(a)).unix() - dayjs(getDateStr(b)).unix();
    }

    return (a.label || "").localeCompare(b.label || "");
  });

  const selectedPeriodLabel =
    selectedMonth === ALL_MONTHS
      ? `${formatYearLabel(selectedYear)} 전체`
      : `${formatYearLabel(selectedYear)} ${formatMonthLabel(selectedMonth)}`;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedLabels([]);
      return;
    }

    setSelectedLabels(allLabels);
  };

  const handleYearClick = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth(ALL_MONTHS);
    setClickedDate(null);
  };

  const handleMonthClick = (month: string) => {
    setSelectedMonth(month);
    setClickedDate(null);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        minHeight: "800px",
        transition: "all 0.3s ease-in-out",
      }}
    >
      <div style={{ flex: 2, padding: 20 }}>
        <div style={{ marginBottom: 12, fontWeight: "bold" }}>
          현재 선택된 기간: {selectedPeriodLabel}
        </div>

        <div style={{ marginBottom: 8 }}>
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => handleYearClick(year)}
              style={buttonStyle(selectedYear === year)}
            >
              {formatYearLabel(year)}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => handleMonthClick(ALL_MONTHS)}
            style={buttonStyle(selectedMonth === ALL_MONTHS)}
          >
            전체
          </button>
          {months.map((month) => (
            <button
              key={month}
              onClick={() => handleMonthClick(month)}
              style={buttonStyle(selectedMonth === month)}
            >
              {formatMonthLabel(month)}
            </button>
          ))}
        </div>

        <div
          style={{
            marginBottom: 20,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
          }}
        >
          <label key="전체" style={checkboxStyle(isAllSelected)}>
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              style={{ marginRight: 6 }}
            />
            전체
          </label>
          {allLabels.map((label) => (
            <label key={label} style={checkboxStyle(selectedLabels.includes(label))}>
              <input
                type="checkbox"
                checked={selectedLabels.includes(label)}
                onChange={() => {
                  const newSelected = selectedLabels.includes(label)
                    ? selectedLabels.filter((item) => item !== label)
                    : [...selectedLabels, label];

                  setSelectedLabels(newSelected);
                }}
                style={{ marginRight: 6 }}
              />
              {label}
            </label>
          ))}
        </div>

        <h3 style={{ marginBottom: 10 }}>
          {selectedMonth === ALL_MONTHS ? `${formatYearLabel(selectedYear)} VOC` : `${selectedMonth} VOC`}
        </h3>

        {labelsToShow.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "100px 0" }}>
            선택된 라벨이 없습니다. 그래프를 보시려면 하나 이상 선택해주세요.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart
              data={selectedMonth === ALL_MONTHS ? monthlyData : dailyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onClick={(event) => {
                if (event?.activeLabel && selectedMonth !== ALL_MONTHS) {
                  setClickedDate(String(event.activeLabel));
                }
              }}
            >
              <XAxis
                dataKey={selectedMonth === ALL_MONTHS ? "month" : "day"}
                tick={selectedMonth === ALL_MONTHS ? undefined : <CustomTick />}
                tickFormatter={(value) =>
                  selectedMonth === ALL_MONTHS ? formatMonthLabel(String(value)) : String(value)
                }
                interval={0}
                minTickGap={5}
              />
              <YAxis allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              {clickedDate && selectedMonth !== ALL_MONTHS && dailyData.some((item) => item.day === clickedDate) && (
                <ReferenceLine
                  x={clickedDate}
                  stroke="#FF0000"
                  strokeDasharray="3 3"
                  label={{
                    value: clickedDate,
                    position: "insideTop",
                    fill: "#FF0000",
                    fontSize: 12,
                  }}
                />
              )}
              {labelsToShow.map((label, index) => (
                <Line
                  key={label}
                  type="linear"
                  dataKey={label}
                  stroke={`hsl(${(index * 47) % 360}, 70%, 50%)`}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ flex: 1, borderLeft: "1px solid #ccc", padding: 20, overflowY: "auto" }}>
        <label style={{ fontSize: 14, marginRight: 8, fontWeight: "bold" }}>정렬 기준:</label>
        <select
          value={sortOption}
          onChange={(event) => setSortOption(event.target.value as "date" | "label")}
          style={{ padding: 4 }}
        >
          <option value="date">날짜순</option>
          <option value="label">라벨순</option>
        </select>

        <h4>
          {labelsToShow.length === 0
            ? "라벨을 선택해주세요"
            : selectedMonth === ALL_MONTHS
              ? "월을 선택해주세요"
              : clickedDate || "일자를 클릭해주세요"}
        </h4>

        {labelsToShow.length === 0 ? (
          <div style={{ color: "#888" }}>그래프를 보시려면 라벨을 하나 이상 선택해주세요.</div>
        ) : selectedMonth === ALL_MONTHS ? (
          <div style={{ color: "#888" }}>연도를 선택한 뒤 월을 눌러 일별 데이터를 확인해주세요.</div>
        ) : clickedDate && filteredRaw.length === 0 ? (
          <div>해당 날짜에 해당 라벨의 데이터가 없습니다.</div>
        ) : (
          sortedRaw.map((item, index) => {
            const sheetId = "1iItW4KpAhTbQ58fBstohkW0J09uOcwGXsNZfInw_xqs";
            const gid = "802777913";
            const rowIndex = rawData.findIndex((row) => row.chatId === item.chatId);
            const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}&range=B${rowIndex + 2}`;

            return (
              <div
                key={index}
                style={{
                  marginBottom: 16,
                  borderBottom: "1px dashed #ddd",
                  paddingBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{item.label}</div>
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      textDecoration: "underline",
                      color: "#007bff",
                      cursor: "pointer",
                    }}
                  >
                    구글 시트에서 보기
                  </a>
                </div>
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>{getDateStr(item)}</div>
                <div style={{ whiteSpace: "pre-line", wordBreak: "break-word" }}>{item.chatText}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
