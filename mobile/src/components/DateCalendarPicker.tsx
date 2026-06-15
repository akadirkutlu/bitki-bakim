import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import { useI18n } from "../localization/I18nContext";
import { colors, radii, shadow, spacing, typography } from "../theme";
import { formatDayLabel, toLocalIsoDay } from "../utils/dates";

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
  accentColor: string;
  label: string;
};

export function DateCalendarPicker({ value, onChange, accentColor, label }: Props) {
  const { t, language } = useI18n();
  const today = toLocalIsoDay();

  function onDayPress(day: DateData) {
    onChange(day.dateString);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.selectedDate}>
        {value ? formatDayLabel(value, language, t) : t("selectDate")}
      </Text>
      <Calendar
        current={value || today}
        maxDate={today}
        onDayPress={onDayPress}
        markedDates={
          value
            ? {
                [value]: {
                  selected: true,
                  selectedColor: accentColor,
                },
              }
            : undefined
        }
        theme={{
          backgroundColor: colors.white,
          calendarBackground: colors.white,
          textSectionTitleColor: colors.textMuted,
          selectedDayBackgroundColor: accentColor,
          selectedDayTextColor: colors.white,
          todayTextColor: accentColor,
          dayTextColor: colors.textDark,
          textDisabledColor: colors.border,
          arrowColor: accentColor,
          monthTextColor: colors.textDark,
          textDayFontWeight: "500",
          textMonthFontWeight: "700",
          textDayHeaderFontWeight: "600",
        }}
        style={styles.calendar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.body,
    fontWeight: "700",
    color: colors.textDark,
  },
  selectedDate: {
    fontSize: typography.small,
    color: colors.textMuted,
  },
  calendar: {
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow.card,
  },
});
