import {
  App,
  SnackbarProvider,
} from "zmp-ui";

import HomePage from "@/pages/index";

const Layout = () => {
  return (
    <App theme="light">
      <SnackbarProvider>
        <HomePage />
      </SnackbarProvider>
    </App>
  );
};
export default Layout;
