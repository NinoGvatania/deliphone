import type { ThemeConfig } from "antd";
import { theme } from "antd";
import { DelifonTokens } from "@deliphone/shared-types/tokens";

/**
 * Ant Design 5 theme driven by Делифон Design System tokens.
 *
 * Primary is graphite ink-900 (neutral default for admin UI); the lime
 * accent is used on hero buttons via `theme.components.Button.colorPrimary`.
 */
export const delifonAntdTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: DelifonTokens.color.ink[900],
    colorInfo: DelifonTokens.color.info.DEFAULT,
    colorSuccess: DelifonTokens.color.success.DEFAULT,
    colorWarning: DelifonTokens.color.warning.DEFAULT,
    colorError: DelifonTokens.color.danger.DEFAULT,
    colorBgLayout: DelifonTokens.color.ink[50],
    colorBgContainer: DelifonTokens.color.ink[0],
    colorTextBase: DelifonTokens.color.ink[900],
    colorBorder: DelifonTokens.color.ink[200],
    borderRadius: DelifonTokens.radius.md,
    borderRadiusLG: DelifonTokens.radius.lg,
    borderRadiusSM: DelifonTokens.radius.sm,
    fontFamily: DelifonTokens.font.sans,
    fontFamilyCode: DelifonTokens.font.mono,
    fontSize: 15,
    lineHeight: 1.5,
  },
  components: {
    Layout: {
      headerBg: DelifonTokens.color.ink[900],
      headerColor: DelifonTokens.color.ink[0],
      bodyBg: DelifonTokens.color.ink[50],
    },
    Button: {
      colorPrimary: DelifonTokens.color.accent.DEFAULT,
      colorPrimaryHover: DelifonTokens.color.accent.hover,
      colorPrimaryActive: DelifonTokens.color.accent.press,
      colorTextLightSolid: DelifonTokens.color.accent.ink,
      borderRadius: DelifonTokens.radius.full,
    },
    Typography: {
      titleMarginBottom: "0.5em",
    },
  },
};
