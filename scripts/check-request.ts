    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
