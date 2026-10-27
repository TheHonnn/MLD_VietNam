import React from "react";
import {
  App,
  SnackbarProvider,
} from "zmp-ui";
import { MainLayout } from "@/layout/MainLayout";

const Layout: React.FC = () => {
  return (
    <App theme="light">
      <SnackbarProvider>
        <MainLayout />
      </SnackbarProvider>
    </App>
  );
};

export default Layout;
