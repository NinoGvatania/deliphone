import type { ThemeConfig } from "antd";
import { theme } from "antd";
import { colors, font, radius } from "@deliphone/ui/tokens";

/**
 * Ant Design 5 theme driven by Делифон tokens.
 * Global `colorPrimary` is the lime accent (task requirement); graphite
 * ink handles text + borders; radii match the pill direction (md = 14).
 */
export const delifonAntdTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  cssVar: true,
  token: {
    colorPrimary: colors.accent.DEFAULT,
    colorInfo: colors.info.DEFAULT,
    colorSuccess: colors.success.DEFAULT,
    colorWarning: colors.warning.DEFAULT,
    colorError: colors.danger.DEFAULT,

    colorText: colors.ink[900],
    colorTextSecondary: colors.ink[500],
    colorTextTertiary: colors.ink[400],
    colorTextHeading: colors.ink[900],

    colorBgLayout: colors.ink[50],
    colorBgContainer: colors.ink[0],
    colorBorder: colors.ink[200],
    colorBorderSecondary: colors.ink[100],

    borderRadius: radius.md,
    borderRadiusLG: radius.lg,
    borderRadiusSM: radius.sm,

    fontFamily: font.sans,
    fontFamilyCode: font.mono,
    fontSize: 14,
    lineHeight: 1.5,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: colors.ink[900],
      headerColor: colors.ink[0],
      headerPadding: "0 24px",
      siderBg: colors.ink[0],
      bodyBg: colors.ink[50],
      triggerBg: colors.ink[100],
      triggerColor: colors.ink[700],
    },
    Menu: {
      itemBg: "transparent",
      itemColor: colors.ink[700],
      itemHoverColor: colors.ink[900],
      itemHoverBg: colors.ink[100],
      itemSelectedBg: colors.accent.soft,
      itemSelectedColor: colors.ink[900],
      itemBorderRadius: radius.md,
      itemMarginInline: 8,
    },
    Button: {
      colorPrimary: colors.accent.DEFAULT,
      colorPrimaryHover: colors.accent.hover,
      colorPrimaryActive: colors.accent.press,
      colorTextLightSolid: colors.accent.ink,
      primaryShadow: "0 1px 2px rgba(15,15,14,0.08)",
      borderRadius: radius.full,
      fontWeight: 600,
    },
    Typography: {
      titleMarginBottom: "0.5em",
    },
    Card: {
      borderRadiusLG: radius.xl,
    },
  },
};
