;; IP Registry Contract

(define-data-var next-work-id uint u0)

(define-map works uint
  {
    creator: principal,
    title: (string-ascii 256),
    description: (string-ascii 1024),
    creation-date: uint,
    rights-holders: (list 10 principal)
  }
)

(define-map work-royalties uint
  {
    total-royalty: uint,
    distributions: (list 10 {holder: principal, share: uint})
  }
)

(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-UNAUTHORIZED (err u403))
(define-constant ERR-INVALID-ROYALTY (err u401))

(define-private (combine-rights-and-shares (rights (list 10 principal)) (shares (list 10 uint)))
  (list
    {holder: (unwrap-panic (element-at rights u0)), share: (unwrap-panic (element-at shares u0))}
    {holder: (unwrap-panic (element-at rights u1)), share: (unwrap-panic (element-at shares u1))}
    {holder: (unwrap-panic (element-at rights u2)), share: (unwrap-panic (element-at shares u2))}
    {holder: (unwrap-panic (element-at rights u3)), share: (unwrap-panic (element-at shares u3))}
    {holder: (unwrap-panic (element-at rights u4)), share: (unwrap-panic (element-at shares u4))}
    {holder: (unwrap-panic (element-at rights u5)), share: (unwrap-panic (element-at shares u5))}
    {holder: (unwrap-panic (element-at rights u6)), share: (unwrap-panic (element-at shares u6))}
    {holder: (unwrap-panic (element-at rights u7)), share: (unwrap-panic (element-at shares u7))}
    {holder: (unwrap-panic (element-at rights u8)), share: (unwrap-panic (element-at shares u8))}
    {holder: (unwrap-panic (element-at rights u9)), share: (unwrap-panic (element-at shares u9))}
  )
)

(define-private (sum-shares (distributions (list 10 {holder: principal, share: uint})))
  (fold + (map get-share distributions) u0)
)

(define-private (get-share (distribution {holder: principal, share: uint}))
  (get share distribution)
)

(define-public (register-work (title (string-ascii 256)) (description (string-ascii 1024)) (rights-holders (list 10 principal)) (royalty-shares (list 10 uint)))
  (let
    (
      (work-id (var-get next-work-id))
      (total-royalty (fold + royalty-shares u0))
      (distributions (combine-rights-and-shares rights-holders royalty-shares))
    )
    (asserts! (is-eq (len rights-holders) (len royalty-shares)) ERR-INVALID-ROYALTY)
    (asserts! (is-eq total-royalty u100) ERR-INVALID-ROYALTY)
    (map-set works work-id
      {
        creator: tx-sender,
        title: title,
        description: description,
        creation-date: block-height,
        rights-holders: rights-holders
      }
    )
    (map-set work-royalties work-id
      {
        total-royalty: total-royalty,
        distributions: distributions
      }
    )
    (var-set next-work-id (+ work-id u1))
    (ok work-id)
  )
)

(define-read-only (get-work (work-id uint))
  (ok (unwrap! (map-get? works work-id) ERR-NOT-FOUND))
)

(define-read-only (get-work-royalties (work-id uint))
  (ok (unwrap! (map-get? work-royalties work-id) ERR-NOT-FOUND))
)

(define-public (update-royalties (work-id uint) (new-distributions (list 10 {holder: principal, share: uint})))
  (let
    (
      (work (unwrap! (map-get? works work-id) ERR-NOT-FOUND))
      (total-royalty (sum-shares new-distributions))
    )
    (asserts! (is-eq (get creator work) tx-sender) ERR-UNAUTHORIZED)
    (asserts! (is-eq total-royalty u100) ERR-INVALID-ROYALTY)
    (ok (map-set work-royalties work-id
      {
        total-royalty: total-royalty,
        distributions: new-distributions
      }
    ))
  )
)

