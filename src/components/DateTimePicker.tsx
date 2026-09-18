import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  mode?: "date" | "time" | "datetime";
  minimumDate?: Date;
  optional?: boolean;
}

export function DateTimePickerField({
  label,
  value,
  onChange,
  mode = "datetime",
  minimumDate,
  optional = false,
}: Props) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value || new Date());
  const [stage, setStage] = useState<"date" | "time">("date");

  const formatDisplay = (d: Date | null) => {
    if (!d) return optional ? "Not set" : "Select";
    if (mode === "date") {
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (mode === "time") {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return (
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      " · " +
      d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  };

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed") {
      setShow(false);
      setStage("date");
      return;
    }

    const picked = selected || tempDate;

    if (Platform.OS === "android" && mode === "datetime") {
      if (stage === "date") {
        // After picking date, open time picker
        setTempDate(picked);
        setStage("time");
      } else {
        // Time picked — combine date + time
        const finalDate = new Date(tempDate);
        finalDate.setHours(picked.getHours());
        finalDate.setMinutes(picked.getMinutes());
        onChange(finalDate);
        setShow(false);
        setStage("date");
      }
    } else {
      // iOS or single-mode
      if (mode === "time") {
        const base = value || new Date();
        const combined = new Date(base);
        combined.setHours(picked.getHours());
        combined.setMinutes(picked.getMinutes());
        onChange(combined);
      } else {
        onChange(picked);
      }
      if (Platform.OS === "ios") {
        // keep open until done
      } else {
        setShow(false);
      }
    }
  };

  const openPicker = () => {
    setTempDate(value || new Date());
    setStage("date");
    setShow(true);
  };

  const clear = () => {
    onChange(null);
    setShow(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={openPicker}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pickerButtonText,
              !value && styles.pickerButtonTextPlaceholder,
            ]}
          >
            {formatDisplay(value)}
          </Text>
          <Text style={styles.calendarIcon}>📅</Text>
        </TouchableOpacity>

        {optional && value && (
          <TouchableOpacity style={styles.clearButton} onPress={clear}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {show && (
        <View style={styles.pickerWrapper}>
          <DateTimePicker
            value={tempDate}
            mode={
              Platform.OS === "ios"
                ? mode
                : mode === "datetime"
                  ? stage
                  : mode
            }
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleChange}
            minimumDate={minimumDate}
          />

          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShow(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  pickerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
  },
  pickerButtonText: { fontSize: 15, color: "#111827", fontWeight: "500" },
  pickerButtonTextPlaceholder: { color: "#9CA3AF", fontWeight: "400" },
  calendarIcon: { fontSize: 18 },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: { color: "#EF4444", fontSize: 16, fontWeight: "700" },
  pickerWrapper: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 8,
  },
  doneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  doneButtonText: { color: "#7C3AED", fontSize: 15, fontWeight: "700" },
});