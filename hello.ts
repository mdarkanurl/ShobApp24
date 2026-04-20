const actions = [
    {
        "name": "Mohammad Arkan",
        "age": 18
    },
    {
        "name": "Jovan ahmed",
        "age": 25
    },
    {
        "name": "Ali",
        "age": 30
    }
];

function main() {
    for (let i = 0; i < actions.length; i++) {
        if(actions[i].age === 18) {
            console.log({ success: true });
            continue;
        }
        console.log({ success: false });
    }
}

main()