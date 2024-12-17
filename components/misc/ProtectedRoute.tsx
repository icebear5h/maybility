"use client";

import { useSession } from "next-auth/react";
import { redirect } from 'next/navigation';
import React, { useEffect, useState } from "react";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { data: session , status} = useSession();
    
    if (status == "unauthenticated"){
        redirect("/")
    }

    return <>{children}</>;
};

export default ProtectedRoute;
