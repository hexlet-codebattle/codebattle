def solution(numerator, denominator, _string, _float, _bool, _hash, _list_str, _list_list_str):
    try:
        res = numerator / denominator
        print('output-test')
        return res
    except Exception as e:
        print("don't do it", str(e))
        raise Exception('AAAAAAAAA')
