import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth';
import prisma from '../../../../../lib/prisma'; // Adjust the path according to your project structure
import cuid from 'cuid'


export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    try {
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            include: {
                conversations: {
                    include: {
                        messages: true, // This line includes the messages within each conversation
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user.conversations, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'An error occurred while fetching conversations' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { title, messages} = await req.json();
    const userEmail = session.user.email;

    try {
        const newConversation = await prisma.conversation.create({
            data: {
                id: cuid(),
                title: title,
                messages: {
                    create: {
                        id: cuid(),
                        role: messages[0].role,
                        content: messages[0].content
                    }
                },
                user: { connect: { email: userEmail } },
            },
        });

        return NextResponse.json(newConversation, { status: 201 });

    } catch (error) {
        console.log(error)
        return NextResponse.json({ message: 'An error occurred while creating a conversation' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userEmail = session.user.email;
    const user = await prisma.user.findUnique ({
        where: { email : userEmail},
        select: {id : true}
    });
    const userId = user?.id;
    const { conversationId, userMessage } = await req.json();
    //console.log (documentId)
    try {
        //console.log("sanity check 1")

        const updatedDocument = await prisma.conversation.update({
            where: {  id: conversationId },
            data: {
                messages:{
                    create:[
                        {
                            id: cuid(),
                            role: 'user',
                            content: userMessage
                        }
                    ]
                }
            }
        });
        return NextResponse.json(updatedDocument, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'An error occurred while updating the conversation' }, { status: 500 });
    }
} 


export async function DELETE(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    try {
        await prisma.conversation.delete({
            where: { id },
        });

        return NextResponse.json(null, { status: 204 });
    } catch (error) {
        return NextResponse.json({ message: 'An error occurred while deleting the document' }, { status: 500 });
    }
}

export async function CHAT(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    try {
        await prisma.conversation.delete({
            where: { id },
        });

        return NextResponse.json(null, { status: 204 });
    } catch (error) {
        return NextResponse.json({ message: 'An error occurred while deleting the document' }, { status: 500 });
    }
}

export async function OPTIONS(req: NextRequest) {
    return NextResponse.json({ methods: ['GET', 'POST', 'PUT', 'DELETE'] }, { status: 200 });
}
