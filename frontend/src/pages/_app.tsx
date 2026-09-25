import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import {
  Container,
  MantineProvider,
  Stack,
  createTheme,
} from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import axios from "axios";
import { getCookie, setCookie } from "cookies-next";
import moment from "moment";
// @ts-ignore
import "moment/min/locales";
import { GetServerSidePropsContext } from "next";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { IntlProvider } from "react-intl";
import Header from "../components/header/Header";
import Footer from "../components/footer/Footer";
import { ConfigContext } from "../hooks/config.hook";
import { UserContext } from "../hooks/user.hook";
import { LOCALES } from "../i18n/locales";
import authService from "../services/auth.service";
import configService from "../services/config.service";
import userService from "../services/user.service";
import globalStyle from "../styles/mantine.style";
import Config from "../types/config.type";
import { CurrentUser } from "../types/user.type";
import i18nUtil from "../utils/i18n.util";
import userPreferences from "../utils/userPreferences.util";

const excludeDefaultLayoutRoutes = ["/admin/config/[category]"];

const theme = createTheme({
  ...globalStyle,
});

function App({ Component, pageProps }: AppProps) {
  const systemTheme = useColorScheme(pageProps.colorScheme);
  const router = useRouter();

  const [colorScheme, setColorScheme] = useState<"light" | "dark">(
    pageProps.colorScheme === "dark" || pageProps.colorScheme === "light"
      ? pageProps.colorScheme
      : systemTheme === "dark"
      ? "dark"
      : "light"
  );

  const [user, setUser] = useState<CurrentUser | null>(pageProps.user);
  const [route, setRoute] = useState<string>(pageProps.route);

  const [configVariables, setConfigVariables] = useState<Config[]>(
    pageProps.configVariables || []
  );

  useEffect(() => {
    setUser(pageProps.user);
  }, [pageProps.user]);

  useEffect(() => {
    setConfigVariables(pageProps.configVariables || []);
  }, [pageProps.configVariables]);

  useEffect(() => {
    setRoute(router.pathname);
  }, [router.pathname]);

  useEffect(() => {
    const interval = setInterval(
      async () => await authService.refreshAccessToken(),
      2 * 60 * 1000 // 2 minutes
    );

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pageProps.language) return;
    const cookieLanguage = getCookie("language");
    if (pageProps.language !== cookieLanguage) {
      i18nUtil.setLanguageCookie(pageProps.language);
    }
  }, [pageProps.language]);

  useEffect(() => {
    const preferredScheme =
      userPreferences.get("colorScheme") === "system"
        ? systemTheme
        : userPreferences.get("colorScheme");

    toggleColorScheme(
      preferredScheme === "dark" || preferredScheme === "light"
        ? preferredScheme
        : "light"
    );
  }, [systemTheme]);

  const toggleColorScheme = (value: "light" | "dark") => {
    setColorScheme(value);
    setCookie("mantine-color-scheme", value, {
      sameSite: "lax",
    });
  };

  const language = useRef(pageProps.language);
  moment.locale(language.current);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </Head>
      <IntlProvider
        messages={i18nUtil.getLocaleByCode(language.current)?.messages}
        locale={language.current}
        defaultLocale={LOCALES.ENGLISH.code}
      >
        <MantineProvider theme={theme} forceColorScheme={colorScheme}>
          <Notifications />
          <ModalsProvider>
            <ConfigContext.Provider
              value={{
                configVariables,
                refresh: async () => {
                  setConfigVariables(await configService.list());
                },
              }}
            >
              <UserContext.Provider
                value={{
                  user,
                  refreshUser: async () => {
                    const fetchedUser = await userService.getCurrentUser();
                    setUser(fetchedUser);
                    return fetchedUser;
                  },
                }}
              >
                {excludeDefaultLayoutRoutes.includes(route) ? (
                  <Component {...pageProps} />
                ) : (
                  <Stack justify="space-between" style={{ minHeight: "100vh" }}>
                    <div>
                      <Header />
                      <Container>
                        <Component {...pageProps} />
                      </Container>
                    </div>
                    <Footer />
                  </Stack>
                )}
              </UserContext.Provider>
            </ConfigContext.Provider>
          </ModalsProvider>
        </MantineProvider>
      </IntlProvider>
    </>
  );
}

App.getInitialProps = async ({ ctx }: { ctx: GetServerSidePropsContext }) => {
  let pageProps: {
    user?: CurrentUser;
    configVariables?: Config[];
    route?: string;
    colorScheme: "light" | "dark";
    language?: string;
  } = {
    route: ctx.resolvedUrl,
    colorScheme:
      (getCookie("mantine-color-scheme", ctx) as "light" | "dark") ?? "light",
  };

  if (ctx.req) {
    const apiURL = process.env.API_URL || "http://localhost:8080";
    const cookieHeader = ctx.req.headers.cookie;

    pageProps.user = await axios(`${apiURL}/api/users/me`, {
      headers: { cookie: cookieHeader },
    })
      .then((res) => res.data)
      .catch(() => null);

    pageProps.configVariables = await axios(`${apiURL}/api/configs`)
      .then((res) => res.data)
      .catch(() => []);

    pageProps.route = ctx.req.url;

    const requestLanguage = i18nUtil.getLanguageFromAcceptHeader(
      ctx.req.headers["accept-language"]
    );

    pageProps.language = ctx.req.cookies["language"] ?? requestLanguage;
  }

  return { pageProps };
};

export default App;