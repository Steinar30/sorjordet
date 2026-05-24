import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { createMediaQuery } from "@solid-primitives/media";

import logo from "/assets/farm-logo.svg";
import styles from "./TopBar.module.css";
import { jwt_localstore_key, jwt_token, set_jwt_token } from "./App";

type NavItem = {
  href?: string;
  label: string;
  adminOnly?: boolean;
  loggedOutOnly?: boolean;
  onClick?: () => void;
};

export default function TopAppBar() {
  const isSmall = createMediaQuery("(max-width:760px)");
  const [isOpen, setIsOpen] = createSignal(false);
  let drawerPanelRef: HTMLElement | undefined;
  let menuButtonRef: HTMLButtonElement | undefined;

  createEffect(() => {
    if (!isSmall()) {
      setIsOpen(false);
    }
  });

  createEffect(() => {
    if (!isOpen()) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (
        drawerPanelRef?.contains(event.target) ||
        menuButtonRef?.contains(event.target)
      ) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    onCleanup(() =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true),
    );
  });

  const navItems = (): NavItem[] => [
    { href: "/stats", label: "Stats" },
    { href: "/fields", label: "Fields" },
    { href: "/harvest", label: "Harvest", adminOnly: true },
    { href: "/admin", label: "Admin", adminOnly: true },
    { href: "/login", label: "Log in", loggedOutOnly: true },
    {
      label: "Log out",
      adminOnly: true,
      onClick: () => {
        window.localStorage.removeItem(jwt_localstore_key);
        set_jwt_token(null);
        setIsOpen(false);
      },
    },
  ];

  const visibleNavItems = () =>
    navItems().filter((item) => {
      if (item.adminOnly) {
        return jwt_token() != null;
      }
      if (item.loggedOutOnly) {
        return jwt_token() == null;
      }
      return true;
    });

  const brand = () => (
    <a href="/" class={styles.brandLink} onClick={() => setIsOpen(false)}>
      <span class={styles.brandMark}>
        <img src={logo} alt="Sørjordet logo" />
      </span>
      <span class={styles.brandTextWrap}>
        <span class={styles.brandEyebrow}>Farm</span>
        <span class={styles.brandTitle}>Sørjordet</span>
      </span>
    </a>
  );

  const navButton = (item: NavItem, drawer = false) => (
    <Show
      when={item.href}
      fallback={
        <button
          type="button"
          class={drawer ? styles.drawerNavItem : styles.navLink}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      }
    >
      {(href) => (
        <a
          class={drawer ? styles.drawerNavItem : styles.navLink}
          href={href()}
          onClick={() => setIsOpen(false)}
        >
          {item.label}
        </a>
      )}
    </Show>
  );

  return (
    <header class={styles.headerContainer}>
      <div class={styles.toolbar}>
        {brand()}

        <nav class={styles.desktopNav} aria-label="Main navigation">
          <For each={visibleNavItems()}>{(item) => navButton(item)}</For>
        </nav>

        <button
          ref={(element) => {
            menuButtonRef = element;
          }}
          type="button"
          class={styles.mobileMenuButton}
          aria-label={isOpen() ? "Close menu" : "Open menu"}
          aria-expanded={isOpen()}
          onClick={() => setIsOpen(!isOpen())}
        >
          <span class={styles.menuLine} />
          <span class={styles.menuLine} />
          <span class={styles.menuLine} />
        </button>
      </div>

      <Show when={isOpen()}>
        <Portal>
          <div class={styles.drawerLayer} onClick={() => setIsOpen(false)}>
            <aside
              ref={(element) => {
                drawerPanelRef = element;
              }}
              class={styles.drawerPanel}
              aria-label="Mobile navigation"
              onClick={(event) => event.stopPropagation()}
            >
              <div class={styles.drawerHeader}>{brand()}</div>
              <nav class={styles.drawerNav}>
                <For each={visibleNavItems()}>
                  {(item) => navButton(item, true)}
                </For>
              </nav>
            </aside>
          </div>
        </Portal>
      </Show>
    </header>
  );
}
