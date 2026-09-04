import { Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

export const isSmallDevice = width < 375;
export const isMediumDevice = width >= 375 && width < 768;
export const isLargeDevice = width >= 768;

export const getBottomPadding = (insets: any) => {
  return Platform.OS === "android" ? 80 : insets.bottom + 60;
};

export const getResponsiveHeight = (percentage: number) => {
  return height * percentage;
};

export const getResponsiveWidth = (percentage: number) => {
  return width * percentage;
};

export const getResponsiveFontSize = (size: number) => {
  if (isSmallDevice) return size * 0.9;
  if (isLargeDevice) return size * 1.1;
  return size;
};
