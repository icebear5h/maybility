import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth';
import prisma from '../../../../../lib/prisma'; // Adjust the path according to your project structure
import { OpenAI } from 'openai';

