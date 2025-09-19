"use client";
import { useState, useEffect } from 'react';

interface User {
  role: string;
  program?: string;
}

interface ProgramAccess {
  canAccessOGV: boolean;
  canAccessTMR: boolean;
  isAdmin: boolean;
  userProgram: string;
}

export function useProgramAccess(user: User | null): ProgramAccess {
  const [access, setAccess] = useState<ProgramAccess>({
    canAccessOGV: false,
    canAccessTMR: false,
    isAdmin: false,
    userProgram: ''
  });

  useEffect(() => {
    if (!user) {
      setAccess({
        canAccessOGV: false,
        canAccessTMR: false,
        isAdmin: false,
        userProgram: ''
      });
      return;
    }

    const isAdmin = user.role === "admin";
    
    if (isAdmin) {
      setAccess({
        canAccessOGV: true,
        canAccessTMR: true,
        isAdmin: true,
        userProgram: 'admin'
      });
      return;
    }

    // Determine user's program
    const rawProgram = (user.program ?? "").toString().trim().toUpperCase();
    let userProgram = '';
    let canAccessOGV = false;
    let canAccessTMR = false;

    if (rawProgram.includes("TMR")) {
      userProgram = 'TMR';
      canAccessTMR = true;
    } else if (rawProgram.includes("OGV")) {
      userProgram = 'oGV';
      canAccessOGV = true;
    }

    setAccess({
      canAccessOGV,
      canAccessTMR,
      isAdmin: false,
      userProgram
    });
  }, [user]);

  return access;
}

export function checkProgramAccess(
  user: User | null, 
  requiredProgram: 'oGV' | 'TMR'
): { hasAccess: boolean; userProgram: string } {
  if (!user) {
    return { hasAccess: false, userProgram: '' };
  }

  const isAdmin = user.role === "admin";
  if (isAdmin) {
    return { hasAccess: true, userProgram: 'admin' };
  }

  const rawProgram = (user.program ?? "").toString().trim().toUpperCase();
  let userProgram = '';

  if (rawProgram.includes("TMR")) {
    userProgram = 'TMR';
  } else if (rawProgram.includes("OGV")) {
    userProgram = 'oGV';
  }

  const hasAccess = userProgram === requiredProgram;
  return { hasAccess, userProgram };
}
