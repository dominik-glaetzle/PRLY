import { NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";
import { Icon, Label } from "expo-router";
import { useI18n } from "@/i18n";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];
  const { t } = useI18n();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="index">
        <Label>{t("tabs.today")}</Label>
        <Icon sf={"calendar"} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="workouts">
        <Label>{t("tabs.workouts")}</Label>
        <Icon sf={"duffle.bag"} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress">
        <Label>{t("tabs.progress")}</Label>
        <Icon sf={"progress.indicator"} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <Label>{t("tabs.explore")}</Label>
        <Icon sf={"safari"} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
