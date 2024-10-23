"use client"

import React from "react";
import {Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Button, ButtonGroup} from "@nextui-org/react";
import {  signIn, SignInAuthorizationParams, useSession } from 'next-auth/react'
import AccountDropdown from "./AccountDropdown";


export default function App() {
  const {data: session} = useSession();

  return (
    <Navbar position="static">
      <NavbarBrand >
        <Link href="/">
          <p className="font-bold text-inherit">Maybility</p>
        </Link>
      </NavbarBrand>
      <NavbarContent className="sm:flex gap-4" justify="center">
        <NavbarItem>
            {session ? (
              <div style={{ display: 'flex', gap: '20px' }} >
                <Link href="/authoring">
                  Authoring
                </Link>
                <Link href="/chatbot">
                  Chatbot
                </Link>
              </div>
            ): (
                <>
                </>
            )}
        </NavbarItem>
      </NavbarContent>
      <NavbarContent justify="end">
        {session ? (
            <>
              <AccountDropdown/>
            </>
        ): (
            <>
                <NavbarItem className="hidden lg:flex">
                  <Button onPress={() => signIn()}>
                     Sign In
                  </Button>
                    
                </NavbarItem>
            </>
        )}
        
      </NavbarContent>
    </Navbar>
  );
}
