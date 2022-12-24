import { jwt_token } from "./App"
import { Farm } from "./bindings/Farm"
import { FarmField } from "./bindings/FarmField"
import { FarmFieldGroup } from "./bindings/FarmFieldGroup"

export async function get_farm(): Promise<Farm[]> {
    return fetch('/api/farm').then(a => a.json())
}

export async function getFarmFieldsForGroup(group_id: number): Promise<FarmField[]> {
    return fetch('/api/farm_fields/group/' + group_id).then(a => a.json())
}

export async function getFarmFieldGroups() : Promise<FarmFieldGroup []> {
    return fetch('/api/farm_field_groups')
        .then(a => a.json());
}

export async function getFarmFieldGroupsWithFields(): Promise<[FarmFieldGroup, FarmField[]][]> {
    return fetch('/api/farm_field_groups')
        .then(a => a.json())
        .then((a: FarmFieldGroup[]) =>
            Promise.all(
                a.map(async g =>
                    [g, await getFarmFieldsForGroup(g.id)]
                )
            )
        )
}

function prepareAuth() : Headers | null {
    const token = jwt_token();
    if (token) {
        return new Headers({
            'Authorization': 'Bearer '+ jwt_token(),
            'Content-Type': 'application/json'
        })
    }
    else {
        return null;
    }
}

export async function tryPostNewFieldGroup(f: FarmFieldGroup) : Promise<number | undefined> {
    const authHeaders = prepareAuth();
    if (authHeaders) {
        return fetch('/api/farm_field_groups', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(f),
            }).then(a => a.json());
            
    } else {
        console.log('not allowed to post without bearer token')
    }
}


export async function tryPostNewField(f: FarmField) : Promise<number | undefined> {
    const authHeaders = prepareAuth();
    console.log ('posting json: ', f);
    if (f.map_polygon_string.length == 0) {
        return;
    }
    if (authHeaders) {
        return fetch('/api/farm_fields', {
                method: 'POST',
                headers: authHeaders,
                mode: "cors",
                body: JSON.stringify(f),
            }).then(a => a.json());
            
    } else {
        console.log('not allowed to post without bearer token')
    }
}
