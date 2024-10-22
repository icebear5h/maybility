import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth';
import prisma from '../../../../../lib/prisma'; // Adjust the path according to your project structure
import { OpenAI } from 'openai';
import { embed } from '@nomic-ai/atlas'
import cuid from 'cuid'

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY as string, // Your OpenAI API Key
// });
type TaskType =
  | 'search_document'
  | 'search_query'
  | 'clustering'
  | 'classification';

type EmbeddingModel = 'nomic-embed-text-v1' | 'nomic-embed-text-v1.5';

type EmbedderOptions = {
    // The embedding endpoint
    model?: EmbeddingModel;
    maxTokens?: number;
    // The prompt prefix to include in the request.
    // prefix?: string;
    taskType?: TaskType;
  };
const embedderOptions: EmbedderOptions = {
    model:'nomic-embed-text-v1',
    taskType: 'search_document'
}

type Embedding = number[];

export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    try {
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            include: { documents: true },
        });

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user.documents, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'An error occurred while fetching documents' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const userEmail = session.user.email;

    try {
        const newDocument = await prisma.document.create({
            data: {
                ...data,
                user: { connect: { email: userEmail } },
            },
        });

        return NextResponse.json(newDocument, { status: 201 });

    } catch (error) {
        console.log(error)
        return NextResponse.json({ message: 'An error occurred while creating a document' }, { status: 500 });
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
    const { documentId, updateEmbedding, title, content } = await req.json();
    //console.log (documentId)
    try {
        //console.log("sanity check 1")

        const updatedDocument = await prisma.document.update({
            where: {  id: documentId },
            data: {
                title: title,
                content: content
            }
        });

        //console.log("working")
        if (updateEmbedding && content){
            try {
                await prisma.documentChunks.deleteMany({
                    where: {
                      documentId: documentId,
                    },
                });
                const chunks = await getEmbedding (content);
                const id = cuid();
                //console.log('userId',userId)
                for (const chunk of chunks){
                    await prisma.$executeRaw`
                    INSERT INTO "DocumentChunks" (id, "userId", "documentId", embedding)
                    VALUES (${id},${userId}, ${documentId}, ${chunk});
                    `;
                }

            } catch (embeddingError) {
                console.error('Error updating embedding:', embeddingError);
                // You might choose to return a different response or continue
            }
        }

        return NextResponse.json(updatedDocument, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'An error occurred while updating the document' }, { status: 500 });
    }
}

function chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }
async function getEmbedding(text: string): Promise<Embedding[]> {
    const chunks = chunkText(text, 3000);
    try {
        const response = await embed(
            chunks,
            embedderOptions,
            process.env.ATLAS_API_KEY
        );
      
      return response; // Adjust based on API response structure
    } catch (error) {
      console.error('Error getting embedding:', error);
      throw new Error('Failed to get embedding');
    }
  }

  


export async function DELETE(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    try {
        await prisma.document.delete({
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
