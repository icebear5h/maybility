import React from "react";
import {Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar} from "@nextui-org/react";
import { useSession, signOut } from "next-auth/react";


export default function AccountDropdown() {
    const { data: session } = useSession();
    const userImage = session?.user?.image || "../images/defaultuser";

    return (
        <div className="flex items-center gap-4 ">
            <Dropdown placement="bottom-end">
                <DropdownTrigger>
                    <Avatar
                        isBordered
                        as="button"
                        className="transition-transform"
                        src={userImage}
                    />
                </DropdownTrigger>
                <DropdownMenu aria-label="Profile Actions" variant="flat">
                    <DropdownItem key="profile" className="h-14 gap-2">
                        <p className="font-semibold">Signed in as</p>
                        <p className="font-semibold">{session?.user?.email}</p>
                    </DropdownItem>
                    <DropdownItem key="settings" className="text-gray-500 dark:text-gray-400">
                        My Settings
                    </DropdownItem>
                    <DropdownItem key="help_and_feedback" className="text-gray-500 dark:text-gray-400">
                        Help & Feedback
                    </DropdownItem>
                    <DropdownItem key="logout" className="text-red-500 hover:bg-red-100 dark:text-red-400">
                        Log Out
                    </DropdownItem>

                </DropdownMenu>
            </Dropdown>
        </div>
    );
}
