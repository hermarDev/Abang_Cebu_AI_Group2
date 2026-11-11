import React from "react";
export default function MockImage() { return null; }
export function MockLink({ children, ...props }) { return <a {...props}>{children}</a>; }
export function useRouter() { return { push: () => {}, replace: () => {}, refresh: () => {} }; }
export function usePathname() { return "/"; }
